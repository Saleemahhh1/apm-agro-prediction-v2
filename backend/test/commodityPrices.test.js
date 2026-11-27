import test from "node:test";
import assert from "node:assert/strict";
import { getRegionalCommodityPrices, getGlobalCommodityPrices, COUNTRY_ISO3 } from "../src/services/commodityPrices.js";

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
      return { ok:true, json:async()=>({results:uuids.map(uuid=>({uuid,datapoints:[{date:"2026-10-01",price_value:1234,periodicity:parsed.searchParams.get("periodicity"),conversion_factor:1}]}))}) };
    }
    throw new Error("Unexpected FPMA endpoint");
  };

  const result = await getRegionalCommodityPrices({country:"Nigeria",state:"Kano",currencyCode:"NGN",fetchImpl});
  assert.equal(result.countryCode,"NGA");
  assert.equal(result.source,"FAO GIEWS FPMA");
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].price,1234);
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].currency,"NGN");
  assert.equal(result.commodities.find(item=>item.id==="rice").records[0].market,"Kano");
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
    /FAO FPMA returned HTTP 503/
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
  assert.equal(maize.status,"no_data");
  assert.equal(result.commodities.find(item=>item.id==="fertilizer").status,"source_unavailable");
});
