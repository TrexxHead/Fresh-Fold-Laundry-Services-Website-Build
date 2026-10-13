import { describe, expect, it } from "vitest";
import { calculateEstimate, requiresPriceApproval } from "./pricing";

describe("FreshFold pricing",()=>{
  it.each([["STUDENT",6,850],["STUDENT",9,1200],["STUDENT",12,1550],["NON_STUDENT",6,1300],["NON_STUDENT",9,1750],["NON_STUDENT",12,2250]] as const)("prices %s %s lb at J$%s",(customerCategory,loadSize,total)=>{expect(calculateEstimate({customerCategory,studentVerified:customerCategory!=="STUDENT",serviceType:"WASH_FOLD",loadSize,items:[]},"2026-01-01T00:00:00Z").knownTotalJmd).toBe(total)});
  it("keeps an unverified student estimate provisional",()=>{expect(calculateEstimate({customerCategory:"STUDENT",studentVerified:false,serviceType:"WASH_FOLD",loadSize:6,items:[]}).provisional).toBe(true)});
  it("calculates fixed ironing quantities",()=>{const result=calculateEstimate({customerCategory:"NON_STUDENT",studentVerified:false,serviceType:"IRONING",items:[{itemId:"iron-shirt",quantity:2},{itemId:"iron-tshirt",quantity:3}]});expect(result.knownTotalJmd).toBe(1100);expect(result.provisional).toBe(false)});
  it("never presents quote-required items as free",()=>{const result=calculateEstimate({customerCategory:"NON_STUDENT",studentVerified:false,serviceType:"WASH_FOLD",loadSize:6,items:[{itemId:"care-rug",quantity:1}]});expect(result.knownTotalJmd).toBe(1300);expect(result.hasQuoteRequired).toBe(true);expect(result.lines.at(-1)?.amountJmd).toBeNull()});
  it("keeps dress pricing as starting at and under review",()=>{const result=calculateEstimate({customerCategory:"NON_STUDENT",studentVerified:false,serviceType:"IRONING",items:[{itemId:"iron-dress",quantity:2}]});expect(result.knownTotalJmd).toBe(700);expect(result.provisional).toBe(true)});
  it("requires approval only when the revision increases",()=>{const original=calculateEstimate({customerCategory:"NON_STUDENT",studentVerified:false,serviceType:"WASH_FOLD",loadSize:9,items:[]});expect(requiresPriceApproval(original,1800)).toBe(true);expect(requiresPriceApproval(original,1750)).toBe(false)});
});
