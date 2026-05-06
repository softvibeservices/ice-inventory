import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import DeliveryPartner from '@/models/DeliveryPartner';
import { transporter } from '@/lib/nodemailer';
import crypto from 'crypto';

function generateOtp(len = 6) {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, '0');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'No account found with that email' },
        { status: 404 }
      );
    }

    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: 'Password Reset OTP',
        html: `<p>Hello ${partner.name},</p>
               <p>Your OTP to reset your password is: <strong>${otp}</strong></p>
               <p>This OTP expires in 10 minutes. Do not share it with anyone.</p>
               <p>— IceCream Inventory</p>`,
      });
    } catch (emailErr) {
      console.error('[forgot-password] email failed:', emailErr);
    }

    return NextResponse.json({
      message: 'OTP sent to your email',
      partnerId: String(partner._id), // frontend needs this for change-password
    }, { status: 200 });

  } catch (err) {
    console.error('POST /api/delivery/forgot-password error:', err);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}