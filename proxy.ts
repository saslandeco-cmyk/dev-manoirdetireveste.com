import {NextRequest,NextResponse } from "next/server";
import {jwtVerify} from "jose";
export async function proxy(req:NextRequest){
 if(req.nextUrl.pathname==="/admin/login")return NextResponse.next();
 const token=req.cookies.get("manoir_admin")?.value;
 if(!token||!process.env.AUTH_SECRET){const url=new URL("/admin/login",req.url);return NextResponse.redirect(url);}
 try{await jwtVerify(token,new TextEncoder().encode(process.env.AUTH_SECRET));return NextResponse.next();}
 catch{return NextResponse.redirect(new URL("/admin/login",req.url));}
}
export const config={matcher:["/admin/:path*"]};
