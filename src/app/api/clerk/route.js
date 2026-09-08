import connectDB from "@/config/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(req) {
  try {
    const wh = new Webhook(process.env.SIGNING_SECRET);
    const headerPayload = await headers();
    const svixHeaders = {
      "svix-id": headerPayload.get("svix-id"),
      "svix-timestamp": headerPayload.get("svix-timestamp"),
      "svix-signature": headerPayload.get("svix-signature"),
    };

    // Get the payload and verify it

    const payload = await req.json();
    const body = JSON.stringify(payload);
    const { data, type } = wh.verify(body, svixHeaders);

    await connectDB();

    switch (type) {
      case "user.created":
      case "user.updated": {
        const userData = {
          _id: data.id,
          email: data.email_addresses?.[0]?.email_address ?? "",
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
          image: data.image_url ?? "",
        };

        if (type === "user.created") {
          await User.create(userData);
        } else {
          await User.findByIdAndUpdate(data.id, userData);
        }

        break;
      }

      case "user.deleted":
        await User.findByIdAndDelete(data.id);
        break;

      default:
        break;
    }

    return NextResponse.json({ message: "Event received" });
  } catch (error) {
    console.error("===== CLERK WEBHOOK ERROR =====");
    console.error(error);

    return NextResponse.json({ message: "Webhook error" }, { status: 400 });
  }
}
