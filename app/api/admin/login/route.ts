import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {SignJWT} from "jose";
import {prisma} from "@/lib/prisma";
export async function POST(req:NextRequest){
 const {email,password}=await req.json().catch(()=>({}));
 const secret=process.env.AUTH_SECRET;
 if(!secret)return NextResponse.json({error:"Configuration administrateur incomplète."},{status:500});
 if(typeof email!=="string"||typeof password!=="string")return NextResponse.json({error:"Identifiants incorrects."},{status:401});
 const envEmail=process.env.ADMIN_EMAIL,envHash=process.env.ADMIN_PASSWORD_HASH;
 let role:string|null=null;
 if(envEmail&&envHash&&email===envEmail&&await bcrypt.compare(password,envHash)){
  role="ADMIN";
 }else{
  const user=await prisma.adminUser.findUnique({where:{email}});
  if(user&&user.active&&await bcrypt.compare(password,user.passwordHash))role=user.role;
 }
 if(!role)return NextResponse.json({error:"Identifiants incorrects."},{status:401});
 const token=await new SignJWT({email,role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(new TextEncoder().encode(secret));
 const res=NextResponse.json({ok:true});res.cookies.set("manoir_admin",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:28800});return res;
}
