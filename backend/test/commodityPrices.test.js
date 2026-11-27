import test from "node:test";
import assert from "node:assert/strict";
import { getRegionalCommodityPrices, COUNTRY_ISO3 } from "../src/services/commodityPrices.js";

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

test("regional commodity adapter reports upstream errors rather than fabricated values", async () => {
  await assert.rejects(
    getRegionalCommodityPrices({country:"Nigeria",fetchImpl:async()=>({ok:false,status:503})}),
    /FAO FPMA returned HTTP 503/
  );
});
