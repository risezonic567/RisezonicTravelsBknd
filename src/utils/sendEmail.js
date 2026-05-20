import nodemailer from "nodemailer";
import dotenv from "dotenv"
dotenv.config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP SERVER READY");
  }
});

const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: `"Risezonic Travel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
       html: `
    <div style="font-family: Arial; padding:20px;">
      <h2>Verify Your Account</h2>
      <p>Your OTP is:</p>
      <h1>${text}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    </div>
    `,
    });

    console.log("MAIL SENT:", info.response);

  } catch (error) {
    console.log("EMAIL ERROR:", error);
    throw error;
  }
};

export default sendEmail;