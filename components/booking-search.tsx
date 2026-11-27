"use client";
import { useState } from "react";
type Stay = { id:string; name:string; type:string; capacity:number; basePrice:number };
export default function BookingSearch({stays}:{stays:Stay[]}) {
 const [arrival,setArrival]=useState(""); const [departure,setDeparture]=useState(""); const [guests,setGuests]=useState("2"); const [type,setType]=useState("ALL");
 const [results,setResults]=useState<Stay[]>([]); const [message,setMessage]=useState("");
 async function search(e:React.FormEvent){e.preventDefault();setMessage("Recherche…");setResults([]);
  const res=await fetch(`/api/availability?arrival=${arrival}&departure=${departure}&guests=${guests}&type=${type}`);
  const data=await res.json(); if(!res.ok){setMessage(data.error||"Erreur");return;} setResults(data.stays);setMessage(data.stays.length?`${data.stays.length} hébergement(s) disponible(s)`:"Aucun hébergement disponible pour ces dates.");
 }
 return <><form className="search" onSubmit={search}>
  <label>Arrivée<input required type="date" value={arrival} onChange={e=>setArrival(e.target.value)}/></label>
  <label>Départ<input required min={arrival||undefined} type="date" value={departure} onChange={e=>setDeparture(e.target.value)}/></label>
  <label>Voyageurs<select value={guests} onChange={e=>setGuests(e.target.value)}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}</select></label>
  <label>Hébergement<select value={type} onChange={e=>setType(e.target.value)}><option value="ALL">Tous</option><option value="ROOM">Chambre</option><option value="COTTAGE">Gîte</option></select></label>
  <button className="btn">Voir les disponibilités</button>
 </form>{message&&<p className="muted">{message}</p>}{results.map(s=><div className="result" key={s.id}><strong>{s.name}</strong><p className="muted">{s.type==="ROOM"?"Chambre d'hôtes":"Gîte"} · jusqu'à {s.capacity} personne(s)</p><a className="btn" href={`/reservation?accommodation=${s.id}&arrival=${arrival}&departure=${departure}&guests=${guests}`}>Choisir ce logement →</a></div>)}</>;
}
