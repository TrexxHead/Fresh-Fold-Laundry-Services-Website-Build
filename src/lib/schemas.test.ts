import { describe, expect, it } from "vitest";
import { bookingSchema } from "./schemas";
const valid={fullName:"Morgan Reid",phone:"876-555-0199",email:"morgan@example.com",bookAs:"GUEST",customerCategory:"NON_STUDENT",addressType:"HOUSE",addressLine:"12 Example Road",community:"Kingston 6",pickupDate:"2026-10-15",pickupSlot:"10:00–10:30 a.m.",serviceType:"WASH_FOLD",loadSize:6,ironingItems:[],specialItems:[],preferences:[],paymentPreference:"CASH",termsAccepted:true,careAcknowledged:true,requestAcknowledged:true};
describe("booking validation",()=>{
  it("accepts a complete request",()=>expect(bookingSchema.safeParse(valid).success).toBe(true));
  it("rejects Saturday evening",()=>expect(bookingSchema.safeParse({...valid,pickupDate:"2026-10-17",pickupSlot:"8:00–8:30 p.m."}).success).toBe(false));
  it("requires an institution for student requests",()=>expect(bookingSchema.safeParse({...valid,customerCategory:"STUDENT"}).success).toBe(false));
  it("requires exact consent",()=>expect(bookingSchema.safeParse({...valid,termsAccepted:false}).success).toBe(false));
});
