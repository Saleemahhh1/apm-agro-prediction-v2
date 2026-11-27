import test from "node:test";
import assert from "node:assert/strict";
import { getRegionalCommodityPrices, getGlobalCommodityPrices, convertRegionalPricesToCurrency, COUNTRY_ISO3 } from "../src/services/commodityPrices.js";

test("regional commodity adapter returns latest local-currency observations and never invents fertilizer data", async () => {
  const series = [
    { uuid:"rice-1", iso3_country_code:"NGA", commodity:"Rice (local)", price_type:"RETAIL", market:"Kano", admin_unit1:"Kano", currency:"NGN", measure_unit_label:"kg", periodicity:[{period:"weekly"}] },
    { uuid:"maize-1", iso3_country_code:"NGA", commodity:"Maize", price_type:"RETAIL", market:"Kaduna", admin_unit1:"Kaduna", currency:"NGN", measure_unit_label:"kg", periodicity:[{period:"monthly"}] },
    { uuid:"beans-1", iso3_country_code:"NGA", commodity:"Beans", price_type:"RETAIL", market:"Kano", admin_unit1:"Kano", currency:"NGN", measure_unit_label:"kg", periodicity:[{period:"weekly"}] },
    { uuid:"potato-1", iso3_country_code:"NGA", commodity:"Potatoes", price_type:"RETAIL", market:"Jos", admin_unit1:"Plateau", currency:"NGN", measure_unit_label:"kg", periodicity:[{period:"monthly"}] }
  ];
  const fetchImpl = async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/FpmaSerieDomestic/")) {
      return { ok:true, json:async()=>({results:series}) };
    }
    if (parsed.pathname.endsWith("/FpmaSeriePrice/")) {
      const uuids = parsed.searchParams.get("uuid__in").split(",");
      return { ok:true, json:async()=>({results:uuids.map(uuid=>({uuid,datapoints:[{date:"2026-09-01",price_value:1200,periodicity:parsed.searchParams.get("periodicity"),conversion_factor:1},{date:"2026-10-01",price_value:1234,periodicity:parsed.searchParams.get("periodicity"),conversion_factor:1}]}))}) };
    }
    throw new Error("Unexpected FPMA endpoint");
  };

  const result = await getRegionalCommodityPrices({country:"Nigeria",state:"Kano",currencyCode:"NGN",fetchImpl});
  assert.equal(result.countryCode,"NGA");
  assert.equal(result.source,"FAO GIEWS FPMA");
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].price,1234);
  assert.deepEqual(result.commodities.find(item=>item.id==="rice").records[0].history,[{date:"2026-09-01",price:1200},{date:"2026-10-01",price:1234}]);
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].currency,"NGN");
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].market,"Kano");
  assert.equal(result.commodities.find(item=>item.id==="maize").status,"no_data");
  assert.equal(result.commodities.find(item=>item.id==="maize").records.length,0);
  assert.equal(result.commodities.find(item=>item.id==="fertilizer").status,"source_unavailable");
});

test("regional commodity adapter does not fabricate prices for countries without a mapped code", async () => {
  const result = await getRegionalCommodityPrices({country:"Unknown Country",currencyCode:"XXX",fetchImpl:async()=>{throw new Error("Should not fetch");}});
  assert.equal(result.countryCode,undefined);
  assert.equal(result.commodities.every(item=>item.records.length===0),true);
  assert.equal(COUNTRY_ISO3.Nigeria,"NGA");
});

test("regional commodity adapter does not substitute profile currency when source currency is missing", async () => {
  const fetchImpl = async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/FpmaSerieDomestic/")) {
      return { ok:true, json:async()=>({results:[
        {uuid:"rice-no-currency",iso3_country_code:"NGA",commodity:"Rice",price_type:"RETAIL",market:"Kano",measure_unit_label:"kg",periodicity:[{period:"weekly"}]}
      ]}) };
    }
    if (parsed.pathname.endsWith("/FpmaSeriePrice/")) {
      return { ok:true, json:async()=>({results:[
        {uuid:"rice-no-currency",datapoints:[{date:"2026-10-01",price_value:1000,periodicity:"weekly"}]}
      ]}) };
    }
    throw new Error("Unexpected FPMA endpoint");
  };
  const result = await getRegionalCommodityPrices({country:"Nigeria",state:"Kano",currencyCode:"NGN",fetchImpl});
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].currency,null);
});

test("regional commodity adapter reports upstream errors rather than fabricated values", async () => {
  await assert.rejects(
    getRegionalCommodityPrices({country:"Nigeria",fetchImpl:async()=>({ok:false,status:503})}),
    /Upstream provider returned HTTP 503/
  );
});

test("global benchmark adapter returns only verified USD observations", async () => {
  const series = [
    {uuid:"global-rice",commodity:"Rice",currency:"USD",market:"Thai 5% broken export",measure_unit_label:"tonne",periodicity:[{period:"monthly"}]},
    {uuid:"global-maize",commodity:"Maize",currency:"EUR",market:"Export benchmark",measure_unit_label:"tonne",periodicity:[{period:"monthly"}]},
    {uuid:"global-potato",commodity:"Potatoes",currency:"EUR",market:"Potato export",measure_unit_label:"tonne",periodicity:[{period:"monthly"}]}
  ];
  const fetchImpl = async url => {
    const parsed = new URL(url);
    if(parsed.pathname.endsWith("/FpmaSerieInternational/")) return {ok:true,json:async()=>({results:series})};
    if(parsed.pathname.endsWith("/FpmaSeriePrice/")){
      const uuids=parsed.searchParams.get("uuid__in").split(",");
      return {ok:true,json:async()=>({results:uuids.map(uuid=>({uuid,datapoints:[{
        date:"2026-10-01",price_value:850,price_value_dollar:uuid==="global-rice"?850:null,
        periodicity:"monthly"
      }]}))})};
    }
    throw new Error("Unexpected FPMA endpoint");
  };
  const result=await getGlobalCommodityPrices({fetchImpl});
  const rice=result.commodities.find(item=>item.id==="rice");
  const maize=result.commodities.find(item=>item.id==="maize");
  assert.equal(result.currency,"USD");
  assert.equal(rice.records[0].priceUSD,850);
  assert.deepEqual(rice.records[0].history,[{date:"2026-10-01",priceUSD:850}]);
  assert.equal(maize.status,"no_data");
  assert.equal(result.commodities.find(item=>item.id==="fertilizer").status,"source_unavailable");
});

test("regional price currency conversion preserves source values and records FX provenance", async () => {
  const input = {
    country:"Nigeria",
    commodities:[{id:"rice",records:[{price:1200,currency:"NGN",unit:"kg",date:"2026-10-01"}]}]
  };
  const fetchImpl = async url => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname,"open.er-api.com");
    assert.equal(parsed.pathname,"/v6/latest/NGN");
    return {ok:true,json:async()=>({result:"success",time_last_update_utc:"Thu, 26 Nov 2026 00:02:31 +0000",rates:{USD:0.0007}})};
  };
  const result = await convertRegionalPricesToCurrency(input,"USD",{fetchImpl});
  const record = result.commodities[0].records[0];
  assert.equal(result.fxStatus,"complete");
  assert.equal(record.price,1200);
  assert.equal(record.originalPrice,1200);
  assert.equal(record.originalCurrency,"NGN");
  assert.equal(record.convertedPrice,0.84);
  assert.equal(record.displayCurrency,"USD");
  assert.equal(record.fxDate,"Thu, 26 Nov 2026 00:02:31 +0000");
  assert.equal(record.fxProvider,"ExchangeRate-API Open Access (daily reference rates)");
});

test("regional price currency conversion leaves source price visible when FX is unavailable", async () => {
  const input = {commodities:[{id:"rice",records:[{price:1200,currency:"NGN"}]}]};
  const result = await convertRegionalPricesToCurrency(input,"GBP",{fetchImpl:async()=>({ok:false,status:503})});
  const record = result.commodities[0].records[0];
  assert.equal(result.fxStatus,"unavailable");
  assert.equal(record.price,1200);
  assert.equal(record.convertedPrice,null);
  assert.equal(record.displayCurrency,null);
});


test("FX conversion reuses a valid cached reference rate for the same currency pair", async () => {
  const input = { commodities:[{ id:"maize", records:[{ price:10, currency:"ZAR", date:"2026-10-01" }] }] };
  let requests = 0;
  const fetchImpl = async url => {
    requests += 1;
    assert.equal(new URL(url).pathname, "/v6/latest/ZAR");
    return { ok:true, json:async()=>({ result:"success", time_last_update_utc:"Fri, 27 Nov 2026 00:00:00 +0000", rates:{ CAD:0.08 } }) };
  };

  const first = await convertRegionalPricesToCurrency(input,"CAD",{fetchImpl});
  const second = await convertRegionalPricesToCurrency(input,"CAD",{fetchImpl:async()=>{ throw new Error("Cached rate should avoid another request"); }});

  assert.equal(requests,1);
  assert.equal(first.commodities[0].records[0].convertedPrice,0.8);
  assert.equal(second.commodities[0].records[0].convertedPrice,0.8);
  assert.deepEqual(second.fxDates,["Fri, 27 Nov 2026 00:00:00 +0000"]);
});

test("FX conversion rejects malformed target currency without making an upstream request", async () => {
  const input = { commodities:[{ id:"rice", records:[{ price:100, currency:"NGN" }] }] };
  const result = await convertRegionalPricesToCurrency(input,"Naira",{fetchImpl:async()=>{ throw new Error("Should not fetch"); }});
  assert.equal(result.fxStatus,"target_currency_unavailable");
  assert.equal(result.displayCurrency,null);
});
