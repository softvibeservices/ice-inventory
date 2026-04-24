// src/app/api/uploads/image/route.ts
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { verifyUserRequest } from "@/lib/userAuth";

export const runtime = "nodejs";

// ✅ Add CORS headers to prevent tracking prevention issues
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  // Verify the user is authenticated before accepting any upload
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in again." },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder =
      (formData.get("folder") as string) || "icecream-inventory";
    const tag = (formData.get("tag") as string) || "asset";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Validate file size based on tag/type
    // Logo: 200 KB max, QR: 250 KB max, Signature: 200 KB max
    let maxSizeKB = 250; // Default to QR's max
    if (tag === "logo" || tag === "sig") {
      maxSizeKB = 200;
    }
    
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSizeKB} KB limit (current: ${Math.round(fileSizeKB)} KB)` },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400, headers: corsHeaders }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            overwrite: true,
            resource_type: "image",
            tags: [tag, `user-${auth.userId}`], // ✅ Add user tag for tracking
            transformation: [{ fetch_format: "auto", quality: "auto" }],
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject(new Error("Upload failed"));
            resolve(result);
          }
        );
        stream.end(buffer);
      }
    );

    return NextResponse.json(
      {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
}