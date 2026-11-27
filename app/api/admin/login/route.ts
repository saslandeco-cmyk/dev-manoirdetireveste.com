import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {SignJWT} from "jose";
export async function POST(req:NextRequest){
 const {email,password}=await req.json().catch(()=>({}));
 const expected=process.env.ADMIN_EMAIL,hash=process.env.ADMIN_PASSWORD_HASH,secret=process.env.AUTH_SECRET;
 if(!expected||!hash||!secret)return NextResponse.json({error:"Configuration administrateur incomplète."},{status:500});
 if(email!==expected||typeof password!=="string"||!await bcrypt.compare(password,hash))return NextResponse.json({error:"Identifiants incorrects."},{status:401});
 const token=await new SignJWT({email,role:"ADMIN"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(new TextEncoder().encode(secret));
 const res=NextResponse.json({ok:true});res.cookies.set("manoir_admin",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:28800});return res;
}
