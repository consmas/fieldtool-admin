import { redirect } from "next/navigation";

export default function CreateTripRedirect() {
  redirect("/trips/new");
}
