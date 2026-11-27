"use client";
import {useState} from "react";
export default function Login(){const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok){setError(d.error);return;}location.href="/admin";}
 return <main className="reservation"><p className="eyebrow">MANOIR DE TIREVESTE</p><h1>Administration</h1><form className="form-stack" onSubmit={submit}><label className="field">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Mot de passe<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="btn">Se connecter</button>{error&&<p className="error">{error}</p>}</form></main>;
}
