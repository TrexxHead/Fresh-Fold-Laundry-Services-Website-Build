import type { Metadata } from "next";
import { BookingWizard } from "./booking-wizard";
export const metadata:Metadata={title:"Book a pickup",description:"Request a FreshFold laundry pickup in Kingston with an itemised JMD estimate."};
export default function BookPage(){return <BookingWizard/>}
