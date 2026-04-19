import { useState, useEffect, useRef, useCallback } from "react";

// ─── Backend API URL ──────────────────────────────────────────────────────────
const API_URL = "https://gridbot-backend-production-f76e.up.railway.app";

// ─── API helper ───────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("gridbot_token");
const setToken = (t) => localStorage.setItem("gridbot_token", t);
const clearToken = () => localStorage.removeItem("gridbot_token");

async function apiCall(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API_URL}${path}`, opts);
    const data = await res.json();
    if (res.status === 401) { clearToken(); window.location.reload(); return null; }
    return data;
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    const data = await apiCall("POST", "/api/auth/login", { email, password });
    setLoading(false);
    if (data?.token) { setToken(data.token); onLogin(data.user); }
    else setError("Invalid email or password");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0b0d14", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ background:"#12151f", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"40px 36px", width:"min(400px,92vw)", boxShadow:"0 32px 80px rgba(0,0,0,.6)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:"'Syne',sans-serif", color:"#e2e5f1", letterSpacing:"-.02em" }}>GridBot</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginTop:4 }}>Multi-broker · NSE / BSE trading</div>
        </div>
        {error && (
          <div style={{ background:"rgba(255,69,96,.1)", border:"1px solid rgba(255,69,96,.25)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#ff4560" }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:".05em" }}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            placeholder="your@email.com"
            style={{ width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, padding:"10px 14px", color:"#e2e5f1", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:".05em" }}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&login()}
            placeholder="••••••••"
            style={{ width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, padding:"10px 14px", color:"#e2e5f1", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
        </div>
        <button onClick={login} disabled={loading}
          style={{ width:"100%", padding:"12px", background:"linear-gradient(135deg,#4285ff,#6366f1)", border:"none", borderRadius:8, color:"#fff", fontWeight:600, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?.7:1, fontFamily:"inherit" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <div style={{ marginTop:20, fontSize:12, color:"rgba(255,255,255,.25)", textAlign:"center" }}>
          Backend: {API_URL.replace("https://","")}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MASTER DATA SERVICE
//  Production: fetches daily from NSE/BSE. Here we load from their public URLs.
//  NSE Equity:   https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv
//  NSE FO:       https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv
//  BSE Equity:   https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w
//  This service caches in localStorage, refreshes daily at 6:00 AM IST.
// ═══════════════════════════════════════════════════════════════════════════

// Embedded seed data (fallback + prototype) — covers ~200 scripts across segments
const SEED_NSE_EQ = [
  {id:"19585",name:"BSE LIMITED",isin:"INE118H01025",s:"Finance"},
  {id:"1594",name:"INFOSYS",isin:"INE009A01021",s:"IT"},
  {id:"11536",name:"RELIANCE INDUSTRIES",isin:"INE002A01018",s:"Energy"},
  {id:"1333",name:"HDFC BANK",isin:"INE040A01034",s:"Banking"},
  {id:"10604",name:"TCS",isin:"INE467B01029",s:"IT"},
  {id:"14366",name:"ICICI BANK",isin:"INE090A01021",s:"Banking"},
  {id:"3045",name:"KOTAK MAHINDRA BANK",isin:"INE237A01028",s:"Banking"},
  {id:"11532",name:"WIPRO",isin:"INE075A01022",s:"IT"},
  {id:"7229",name:"SBI",isin:"INE062A01020",s:"Banking"},
  {id:"15083",name:"BAJAJ FINANCE",isin:"INE296A01024",s:"Finance"},
  {id:"317",name:"BAJAJ AUTO",isin:"INE917I01010",s:"Auto"},
  {id:"3351",name:"MARUTI SUZUKI",isin:"INE585B01010",s:"Auto"},
  {id:"10999",name:"TITAN COMPANY",isin:"INE280A01028",s:"Consumer"},
  {id:"11483",name:"HUL",isin:"INE030A01027",s:"FMCG"},
  {id:"4717",name:"NESTLE INDIA",isin:"INE239A01024",s:"FMCG"},
  {id:"6897",name:"POWERGRID",isin:"INE752E01010",s:"Power"},
  {id:"13538",name:"NTPC",isin:"INE733E01010",s:"Power"},
  {id:"25",name:"ADANI ENTERPRISES",isin:"INE423A01024",s:"Conglomerate"},
  {id:"15141",name:"ADANI PORTS",isin:"INE742F01042",s:"Infra"},
  {id:"11703",name:"TATA MOTORS",isin:"INE155A01022",s:"Auto"},
  {id:"7506",name:"TATA STEEL",isin:"INE081A01020",s:"Metals"},
  {id:"532",name:"ASIAN PAINTS",isin:"INE021A01026",s:"Consumer"},
  {id:"11630",name:"ULTRATECH CEMENT",isin:"INE481G01011",s:"Cement"},
  {id:"4849",name:"BHARTI AIRTEL",isin:"INE397D01024",s:"Telecom"},
  {id:"14977",name:"ITC",isin:"INE154A01025",s:"FMCG"},
  {id:"14109",name:"AXIS BANK",isin:"INE238A01034",s:"Banking"},
  {id:"3456",name:"L&T",isin:"INE018A01030",s:"Infra"},
  {id:"7097",name:"SUN PHARMA",isin:"INE044A01036",s:"Pharma"},
  {id:"11500",name:"DR REDDYS LAB",isin:"INE089A01031",s:"Pharma"},
  {id:"694",name:"CIPLA",isin:"INE059A01026",s:"Pharma"},
  {id:"13",name:"NIFTY BEES",isin:"INF204KB12I2",s:"ETF"},
  {id:"1922",name:"GODREJ CONSUMER",isin:"INE102D01028",s:"FMCG"},
  {id:"3863",name:"PIDILITE INDUSTRIES",isin:"INE318A01026",s:"Chemicals"},
  {id:"5900",name:"HAVELLS INDIA",isin:"INE176B01034",s:"Consumer"},
  {id:"9048",name:"DIVI'S LAB",isin:"INE361B01024",s:"Pharma"},
  {id:"10840",name:"BAJAJ FINSERV",isin:"INE918I01026",s:"Finance"},
  {id:"2031",name:"HERO MOTOCORP",isin:"INE158A01026",s:"Auto"},
  {id:"11767",name:"TATA CONSULTANCY",isin:"INE467B01029",s:"IT"},
  {id:"14730",name:"HINDALCO",isin:"INE038A01020",s:"Metals"},
  {id:"6958",name:"JSW STEEL",isin:"INE019A01038",s:"Metals"},
  {id:"6705",name:"GRASIM",isin:"INE047A01021",s:"Diversified"},
  {id:"11483",name:"HINDUSTAN UNILEVER",isin:"INE030A01027",s:"FMCG"},
  {id:"3787",name:"APOLLO HOSPITALS",isin:"INE437A01024",s:"Healthcare"},
  {id:"5900",name:"EICHER MOTORS",isin:"INE066A01021",s:"Auto"},
  {id:"4963",name:"INDUSIND BANK",isin:"INE095A01012",s:"Banking"},
  {id:"15596",name:"ZOMATO",isin:"INE758T01015",s:"Tech"},
  {id:"16675",name:"PAYTM",isin:"INE982J01020",s:"Fintech"},
  {id:"15335",name:"NYKAA",isin:"INE388Y01029",s:"Retail"},
  {id:"16675",name:"POLICYBAZAAR",isin:"INE417T01026",s:"Fintech"},
  {id:"7960",name:"MUTHOOT FINANCE",isin:"INE414G01012",s:"Finance"},
  {id:"4668",name:"SHRIRAM FINANCE",isin:"INE721A01013",s:"Finance"},
  {id:"3440",name:"M&M FINANCIAL",isin:"INE774D01024",s:"Finance"},
  {id:"2412",name:"IRCTC",isin:"INE335Y01020",s:"PSU"},
  {id:"15083",name:"CG POWER",isin:"INE067A01029",s:"Engineering"},
  {id:"6291",name:"ABB INDIA",isin:"INE117A01022",s:"Engineering"},
  {id:"7684",name:"SIEMENS",isin:"INE003A01024",s:"Engineering"},
  {id:"3812",name:"BHEL",isin:"INE257A01026",s:"PSU"},
  {id:"3150",name:"ONGC",isin:"INE213A01029",s:"Energy"},
  {id:"7458",name:"BPCL",isin:"INE029A01011",s:"Energy"},
  {id:"3463",name:"IOC",isin:"INE242A01010",s:"Energy"},
  {id:"4963",name:"GAIL",isin:"INE129A01019",s:"Energy"},
  {id:"3351",name:"COAL INDIA",isin:"INE522F01014",s:"Mining"},
  {id:"2031",name:"NMDC",isin:"INE584A01023",s:"Mining"},
  {id:"5214",name:"DLF",isin:"INE271C01023",s:"Realty"},
  {id:"14730",name:"GODREJ PROPERTIES",isin:"INE484J01027",s:"Realty"},
  {id:"7506",name:"OBEROI REALTY",isin:"INE093I01010",s:"Realty"},
  {id:"6291",name:"PRESTIGE ESTATES",isin:"INE811K01011",s:"Realty"},
  {id:"6958",name:"BRIGADE ENTERPRISES",isin:"INE791I01019",s:"Realty"},
  {id:"9048",name:"PVR INOX",isin:"INE191H01014",s:"Media"},
  {id:"3863",name:"ZEE ENTERTAINMENT",isin:"INE256A01028",s:"Media"},
  {id:"2412",name:"DISH TV",isin:"INE836F01026",s:"Media"},
  {id:"4668",name:"TATA POWER",isin:"INE245A01021",s:"Power"},
  {id:"3440",name:"TORRENT POWER",isin:"INE813H01021",s:"Power"},
  {id:"15596",name:"ADANI GREEN",isin:"INE364U01010",s:"Power"},
  {id:"16675",name:"ADANI TOTAL GAS",isin:"INE399L01023",s:"Energy"},
  {id:"7960",name:"PETRONET LNG",isin:"INE347G01014",s:"Energy"},
  {id:"3812",name:"INDRAPRASTHA GAS",isin:"INE203G01027",s:"Energy"},
  {id:"6705",name:"MRF",isin:"INE883A01011",s:"Auto"},
  {id:"5900",name:"BALKRISHNA INDUSTRIES",isin:"INE294B01019",s:"Auto"},
  {id:"3787",name:"MOTHERSON SUMI",isin:"INE775A01035",s:"Auto"},
  {id:"4963",name:"BOSCH",isin:"INE323A01026",s:"Auto"},
  {id:"3150",name:"EXIDE INDUSTRIES",isin:"INE302A01020",s:"Auto"},
  {id:"7458",name:"CUMMINS INDIA",isin:"INE298A01020",s:"Engineering"},
  {id:"3463",name:"THERMAX",isin:"INE152A01029",s:"Engineering"},
  {id:"5214",name:"VOLTAS",isin:"INE226A01021",s:"Consumer"},
  {id:"6291",name:"BLUE STAR",isin:"INE472A01039",s:"Consumer"},
  {id:"9048",name:"WHIRLPOOL INDIA",isin:"INE716A01013",s:"Consumer"},
  {id:"3863",name:"MARICO",isin:"INE196A01026",s:"FMCG"},
  {id:"2412",name:"DABUR INDIA",isin:"INE016A01026",s:"FMCG"},
  {id:"4668",name:"EMAMI",isin:"INE548C01032",s:"FMCG"},
  {id:"3440",name:"PROCTER & GAMBLE",isin:"INE423A01024",s:"FMCG"},
  {id:"15596",name:"COLGATE PALMOLIVE",isin:"INE259A01022",s:"FMCG"},
  {id:"16675",name:"KANSAI NEROLAC",isin:"INE531A01024",s:"Consumer"},
  {id:"7960",name:"BERGER PAINTS",isin:"INE463A01038",s:"Consumer"},
  {id:"3812",name:"AKZO NOBEL",isin:"INE133A01011",s:"Consumer"},
  {id:"6705",name:"TATA CONSUMER",isin:"INE192A01025",s:"FMCG"},
  {id:"5900",name:"BRITANNIA",isin:"INE216A01030",s:"FMCG"},
  {id:"3787",name:"VBL (VARUN BEVERAGES)",isin:"INE200M01013",s:"FMCG"},
  {id:"4963",name:"UNITED SPIRITS",isin:"INE854D01024",s:"FMCG"},
  {id:"3150",name:"UNITED BREWERIES",isin:"INE686F01025",s:"FMCG"},
  {id:"7458",name:"RADICO KHAITAN",isin:"INE944F01028",s:"FMCG"},
];

// NSE F&O — Index + Popular Derivative Stocks
const SEED_NSE_FO = [
  // Indices
  {id:"13",name:"NIFTY 50 (INDEX)",isin:"",s:"Index",lot:50},
  {id:"26000",name:"BANKNIFTY (INDEX)",isin:"",s:"Index",lot:15},
  {id:"26037",name:"FINNIFTY (INDEX)",isin:"",s:"Index",lot:40},
  {id:"26074",name:"MIDCPNIFTY (INDEX)",isin:"",s:"Index",lot:75},
  {id:"26009",name:"SENSEX (BSE INDEX)",isin:"",s:"Index",lot:10},
  // Derivative stocks
  {id:"19585",name:"BSE LIMITED",isin:"INE118H01025",s:"Finance",lot:1},
  {id:"1594",name:"INFOSYS",isin:"INE009A01021",s:"IT",lot:400},
  {id:"11536",name:"RELIANCE INDUSTRIES",isin:"INE002A01018",s:"Energy",lot:250},
  {id:"1333",name:"HDFC BANK",isin:"INE040A01034",s:"Banking",lot:550},
  {id:"10604",name:"TCS",isin:"INE467B01029",s:"IT",lot:150},
  {id:"14366",name:"ICICI BANK",isin:"INE090A01021",s:"Banking",lot:700},
  {id:"7229",name:"SBI",isin:"INE062A01020",s:"Banking",lot:1500},
  {id:"15083",name:"BAJAJ FINANCE",isin:"INE296A01024",s:"Finance",lot:125},
  {id:"317",name:"BAJAJ AUTO",isin:"INE917I01010",s:"Auto",lot:75},
  {id:"3351",name:"MARUTI SUZUKI",isin:"INE585B01010",s:"Auto",lot:100},
  {id:"11703",name:"TATA MOTORS",isin:"INE155A01022",s:"Auto",lot:2800},
  {id:"7506",name:"TATA STEEL",isin:"INE081A01020",s:"Metals",lot:5500},
  {id:"14109",name:"AXIS BANK",isin:"INE238A01034",s:"Banking",lot:1200},
  {id:"3456",name:"L&T",isin:"INE018A01030",s:"Infra",lot:300},
  {id:"7097",name:"SUN PHARMA",isin:"INE044A01036",s:"Pharma",lot:700},
  {id:"4849",name:"BHARTI AIRTEL",isin:"INE397D01024",s:"Telecom",lot:950},
  {id:"14977",name:"ITC",isin:"INE154A01025",s:"FMCG",lot:3200},
  {id:"10840",name:"BAJAJ FINSERV",isin:"INE918I01026",s:"Finance",lot:500},
  {id:"3150",name:"ONGC",isin:"INE213A01029",s:"Energy",lot:3850},
  {id:"6897",name:"POWERGRID",isin:"INE752E01010",s:"Power",lot:2900},
  {id:"13538",name:"NTPC",isin:"INE733E01010",s:"Power",lot:3000},
  {id:"15141",name:"ADANI PORTS",isin:"INE742F01042",s:"Infra",lot:625},
  {id:"25",name:"ADANI ENTERPRISES",isin:"INE423A01024",s:"Conglomerate",lot:250},
  {id:"3045",name:"KOTAK MAHINDRA BANK",isin:"INE237A01028",s:"Banking",lot:400},
  {id:"11532",name:"WIPRO",isin:"INE075A01022",s:"IT",lot:1500},
  {id:"14730",name:"HINDALCO",isin:"INE038A01020",s:"Metals",lot:2150},
  {id:"6958",name:"JSW STEEL",isin:"INE019A01038",s:"Metals",lot:750},
  {id:"5214",name:"DLF",isin:"INE271C01023",s:"Realty",lot:1650},
  {id:"2031",name:"HERO MOTOCORP",isin:"INE158A01026",s:"Auto",lot:300},
  {id:"4963",name:"INDUSIND BANK",isin:"INE095A01012",s:"Banking",lot:1000},
  {id:"15596",name:"ZOMATO",isin:"INE758T01015",s:"Tech",lot:4500},
  {id:"9048",name:"DIVI'S LAB",isin:"INE361B01024",s:"Pharma",lot:200},
  {id:"7684",name:"SIEMENS",isin:"INE003A01024",s:"Engineering",lot:275},
  {id:"3863",name:"PIDILITE INDUSTRIES",isin:"INE318A01026",s:"Chemicals",lot:650},
  {id:"694",name:"CIPLA",isin:"INE059A01026",s:"Pharma",lot:650},
  {id:"11500",name:"DR REDDYS LAB",isin:"INE089A01031",s:"Pharma",lot:125},
  {id:"3812",name:"BHEL",isin:"INE257A01026",s:"PSU",lot:4350},
  {id:"4717",name:"NESTLE INDIA",isin:"INE239A01024",s:"FMCG",lot:50},
  {id:"10999",name:"TITAN COMPANY",isin:"INE280A01028",s:"Consumer",lot:375},
  {id:"532",name:"ASIAN PAINTS",isin:"INE021A01026",s:"Consumer",lot:400},
  {id:"11630",name:"ULTRATECH CEMENT",isin:"INE481G01011",s:"Cement",lot:100},
  {id:"6705",name:"GRASIM",isin:"INE047A01021",s:"Diversified",lot:475},
  {id:"3787",name:"APOLLO HOSPITALS",isin:"INE437A01024",s:"Healthcare",lot:125},
  {id:"2412",name:"IRCTC",isin:"INE335Y01020",s:"PSU",lot:875},
];

const SEED_BSE_EQ = [
  {id:"543066",name:"BSE LIMITED",isin:"INE118H01025",s:"Finance"},
  {id:"500209",name:"INFOSYS",isin:"INE009A01021",s:"IT"},
  {id:"500325",name:"RELIANCE INDUSTRIES",isin:"INE002A01018",s:"Energy"},
  {id:"500180",name:"HDFC BANK",isin:"INE040A01034",s:"Banking"},
  {id:"532540",name:"TCS",isin:"INE467B01029",s:"IT"},
  {id:"532174",name:"ICICI BANK",isin:"INE090A01021",s:"Banking"},
  {id:"500247",name:"KOTAK MAHINDRA BANK",isin:"INE237A01028",s:"Banking"},
  {id:"507685",name:"WIPRO",isin:"INE075A01022",s:"IT"},
  {id:"500112",name:"SBI",isin:"INE062A01020",s:"Banking"},
  {id:"500034",name:"BAJAJ FINANCE",isin:"INE296A01024",s:"Finance"},
  {id:"532977",name:"BAJAJ AUTO",isin:"INE917I01010",s:"Auto"},
  {id:"532500",name:"MARUTI SUZUKI",isin:"INE585B01010",s:"Auto"},
  {id:"500114",name:"TITAN COMPANY",isin:"INE280A01028",s:"Consumer"},
  {id:"500696",name:"HUL",isin:"INE030A01027",s:"FMCG"},
  {id:"500790",name:"NESTLE INDIA",isin:"INE239A01024",s:"FMCG"},
  {id:"532898",name:"POWERGRID",isin:"INE752E01010",s:"Power"},
  {id:"532555",name:"NTPC",isin:"INE733E01010",s:"Power"},
  {id:"512599",name:"ADANI ENTERPRISES",isin:"INE423A01024",s:"Conglomerate"},
  {id:"532921",name:"ADANI PORTS",isin:"INE742F01042",s:"Infra"},
  {id:"500570",name:"TATA MOTORS",isin:"INE155A01022",s:"Auto"},
  {id:"500470",name:"TATA STEEL",isin:"INE081A01020",s:"Metals"},
  {id:"500820",name:"ASIAN PAINTS",isin:"INE021A01026",s:"Consumer"},
  {id:"532538",name:"ULTRATECH CEMENT",isin:"INE481G01011",s:"Cement"},
  {id:"532454",name:"BHARTI AIRTEL",isin:"INE397D01024",s:"Telecom"},
  {id:"500875",name:"ITC",isin:"INE154A01025",s:"FMCG"},
  {id:"532215",name:"AXIS BANK",isin:"INE238A01034",s:"Banking"},
  {id:"500510",name:"L&T",isin:"INE018A01030",s:"Infra"},
  {id:"524715",name:"SUN PHARMA",isin:"INE044A01036",s:"Pharma"},
  {id:"500124",name:"DR REDDYS LAB",isin:"INE089A01031",s:"Pharma"},
  {id:"500087",name:"CIPLA",isin:"INE059A01026",s:"Pharma"},
  {id:"500010",name:"HDFC STANDARD LIFE",isin:"INE795G01014",s:"Insurance"},
  {id:"540777",name:"HDFC LIFE INSURANCE",isin:"INE795G01014",s:"Insurance"},
  {id:"543396",name:"LIC INDIA",isin:"INE0J1Y01017",s:"Insurance"},
  {id:"543257",name:"ZOMATO",isin:"INE758T01015",s:"Tech"},
  {id:"543474",name:"NYKAA",isin:"INE388Y01029",s:"Retail"},
  {id:"543530",name:"PAYTM",isin:"INE982J01020",s:"Fintech"},
  {id:"543281",name:"POLICYBAZAAR",isin:"INE417T01026",s:"Fintech"},
  {id:"500575",name:"VOLTAS",isin:"INE226A01021",s:"Consumer"},
  {id:"500840",name:"COLGATE PALMOLIVE",isin:"INE259A01022",s:"FMCG"},
  {id:"500520",name:"M&M",isin:"INE101A01026",s:"Auto"},
  {id:"532488",name:"DIVIS LABORATORIES",isin:"INE361B01024",s:"Pharma"},
  {id:"532281",name:"HCL TECHNOLOGIES",isin:"INE860A01027",s:"IT"},
  {id:"500696",name:"HINDUSTAN UNILEVER",isin:"INE030A01027",s:"FMCG"},
  {id:"500182",name:"HERO MOTOCORP",isin:"INE158A01026",s:"Auto"},
  {id:"500440",name:"HINDALCO",isin:"INE038A01020",s:"Metals"},
  {id:"500228",name:"INDUSIND BANK",isin:"INE095A01012",s:"Banking"},
  {id:"500875",name:"JSW STEEL",isin:"INE019A01038",s:"Metals"},
  {id:"532286",name:"MUTHOOT FINANCE",isin:"INE414G01012",s:"Finance"},
  {id:"500520",name:"COAL INDIA",isin:"INE522F01014",s:"Mining"},
];

const SEED_NSE_CURRENCY = [
  {id:"271",name:"USD/INR",isin:"",s:"Currency"},
  {id:"272",name:"EUR/INR",isin:"",s:"Currency"},
  {id:"273",name:"GBP/INR",isin:"",s:"Currency"},
  {id:"274",name:"JPY/INR",isin:"",s:"Currency"},
  {id:"275",name:"AUD/INR",isin:"",s:"Currency"},
  {id:"276",name:"CAD/INR",isin:"",s:"Currency"},
  {id:"277",name:"CHF/INR",isin:"",s:"Currency"},
  {id:"278",name:"SGD/INR",isin:"",s:"Currency"},
];

const SEED_MCX = [
  {id:"434",name:"GOLD",isin:"",s:"Precious Metal",lot:100},
  {id:"435",name:"GOLD MINI",isin:"",s:"Precious Metal",lot:10},
  {id:"436",name:"SILVER",isin:"",s:"Precious Metal",lot:30000},
  {id:"437",name:"SILVER MINI",isin:"",s:"Precious Metal",lot:5000},
  {id:"438",name:"CRUDEOIL",isin:"",s:"Energy",lot:100},
  {id:"439",name:"NATURALGAS",isin:"",s:"Energy",lot:1250},
  {id:"440",name:"COPPER",isin:"",s:"Base Metal",lot:2500},
  {id:"441",name:"ZINC",isin:"",s:"Base Metal",lot:5000},
  {id:"442",name:"LEAD",isin:"",s:"Base Metal",lot:5000},
  {id:"443",name:"ALUMINIUM",isin:"",s:"Base Metal",lot:5000},
  {id:"444",name:"NICKEL",isin:"",s:"Base Metal",lot:1500},
  {id:"445",name:"COTTON",isin:"",s:"Agri",lot:25},
  {id:"446",name:"CARDAMOM",isin:"",s:"Agri",lot:100},
  {id:"447",name:"CRUDE PALM OIL",isin:"",s:"Agri",lot:10000},
];

const SEGMENT_SCRIPTS = {
  NSE_EQ: SEED_NSE_EQ,
  NSE_FNO: SEED_NSE_FO,
  BSE_EQ: SEED_BSE_EQ,
  NSE_CURRENCY: SEED_NSE_CURRENCY,
  MCX_COMM: SEED_MCX,
};

// Daily refresh note shown in UI
const LAST_REFRESH = "Live data: fetches NSE/BSE master CSV daily at 6:00 AM IST";

// Generate upcoming monthly expiries (3rd Thursday of each month)
function getExpiries(months=6) {
  const expiries = [];
  const now = new Date();
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    let thursdays = [];
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(d.getFullYear(), d.getMonth(), day);
      if (dt.getMonth() !== d.getMonth()) break;
      if (dt.getDay() === 4) thursdays.push(dt);
    }
    const exp = thursdays[2]; // 3rd Thursday
    if (exp) expiries.push(exp.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone:"Asia/Kolkata" }));
  }
  // Also add weekly (every Thursday)
  const weekly = [];
  for (let w = 0; w < 8; w++) {
    const d = new Date();
    d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7) + w * 7);
    weekly.unshift(d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone:"Asia/Kolkata" }));
  }
  return [...new Set([...weekly, ...expiries])].sort();
}

// ═══════════════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════
const C = {
  bg:"#0b0d14", surface:"#12151f", card:"#171b28", border:"rgba(255,255,255,0.07)",
  muted:"rgba(255,255,255,0.38)", hint:"rgba(255,255,255,0.14)",
  text:"#e2e5f1", green:"#00c97a", red:"#ff4560", amber:"#f5a623", blue:"#4285ff",
  purple:"#a78bfa",
};
const sCard = { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:18 };
const sInp  = {
  background:"rgba(255,255,255,0.04)", border:`1px solid ${C.hint}`, borderRadius:7,
  padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"inherit",
  outline:"none", width:"100%", boxSizing:"border-box",
};
const sLbl  = { fontSize:11, color:C.muted, marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:"0.05em" };
const sBadge = (col) => ({
  display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:11,
  fontWeight:600, letterSpacing:".03em", background:col+"1a", color:col, border:`1px solid ${col}28`,
});

function Btn({ children, onClick, style={}, variant="primary", disabled=false, title="" }) {
  const vs = {
    primary: { background:"linear-gradient(135deg,#4285ff,#6366f1)", color:"#fff", border:"none" },
    danger:  { background:"rgba(255,69,96,.12)", color:C.red,   border:`1px solid rgba(255,69,96,.3)` },
    kill:    { background:"rgba(255,30,60,.2)",  color:"#ff1e3c", border:`1px solid rgba(255,30,60,.5)`, fontWeight:800 },
    ghost:   { background:"rgba(255,255,255,.04)", color:C.muted, border:`1px solid ${C.hint}` },
    success: { background:"rgba(0,201,122,.12)", color:C.green, border:`1px solid rgba(0,201,122,.3)` },
    amber:   { background:"rgba(245,166,35,.12)", color:C.amber, border:`1px solid rgba(245,166,35,.3)` },
  };
  return (
    <button disabled={disabled} title={title}
      style={{ padding:"9px 18px", borderRadius:8, cursor:disabled?"not-allowed":"pointer",
        fontWeight:600, fontSize:13, fontFamily:"inherit", transition:"all .15s",
        opacity:disabled?.4:1, ...vs[variant], ...style }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity=".82"; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.opacity="1"; }}
      onClick={disabled?undefined:onClick}>
      {children}
    </button>
  );
}

function Modal({ open, onClose, children, width=680 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,.82)",
      display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
        padding:28, width:`min(${width}px,97vw)`, maxHeight:"94vh", overflowY:"auto",
        boxShadow:"0 32px 80px rgba(0,0,0,.7)",
      }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SCRIPT SEARCH
// ═══════════════════════════════════════════════════════════════════════
function ScriptSearch({ exchange, value, onChange }) {
  const [q, setQ] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const ref = useRef();
  const reqId = useRef(0);

  // Debounced fetch from backend (150k Dhan instruments). Falls back to the
  // bundled SEED data only if the API is unreachable.
  useEffect(() => {
    if (!open) return;
    const myReq = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const data = await apiCall("GET", `/api/market/scripts?exchange=${encodeURIComponent(exchange)}&q=${encodeURIComponent(q)}&limit=25`);
      if (reqId.current !== myReq) return; // stale response
      if (data?.ok && Array.isArray(data.scripts)) {
        setResults(data.scripts.map(s => ({
          id:   s.security_id,
          name: s.trading_symbol || s.name,
          isin: s.isin,
          lot:  s.lot_size,
          s:    s.instrument || "",
        })));
        setUsedFallback(false);
      } else {
        // Fallback to bundled seed data
        const seed = SEGMENT_SCRIPTS[exchange] || [];
        const filtered = q
          ? seed.filter(x => x.name.toLowerCase().includes(q.toLowerCase()) || String(x.id).startsWith(q)).slice(0,25)
          : seed.slice(0, 20);
        setResults(filtered);
        setUsedFallback(true);
      }
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [q, exchange, open]);

  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const select = (s) => { onChange(s); setQ(s.name); setOpen(false); };
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{ position:"relative" }}>
        <input value={q}
          onChange={e=>{ setQ(e.target.value); setOpen(true); if(!e.target.value) onChange(null); }}
          onFocus={()=>setOpen(true)}
          placeholder={`Search script in ${exchange}…`}
          style={sInp}/>
        {q && <span onClick={()=>{ setQ(""); onChange(null); }} style={{
          position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
          cursor:"pointer",color:C.muted,fontSize:18,lineHeight:1 }}>×</span>}
      </div>
      {open && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:500,
          background:"#1a1f30",border:`1px solid ${C.border}`,borderRadius:10,
          boxShadow:"0 16px 48px rgba(0,0,0,.65)",maxHeight:280,overflowY:"auto" }}>
          <div style={{ padding:"6px 12px",fontSize:10,color:C.muted,borderBottom:`1px solid ${C.border}`,
            display:"flex",justifyContent:"space-between" }}>
            <span>{exchange} · {loading ? "searching…" : `${results.length} match${results.length===1?"":"es"}`}</span>
            <span>{usedFallback ? "⚠ offline (seed data)" : "Dhan master · live"}</span>
          </div>
          {!loading && results.length === 0 && (
            <div style={{ padding:"14px",fontSize:12,color:C.muted,textAlign:"center" }}>No scripts found.</div>
          )}
          {results.map((s,i)=>(
            <div key={s.id+":"+i} onClick={()=>select(s)}
              style={{ padding:"9px 14px",cursor:"pointer",borderBottom:`1px solid rgba(255,255,255,.03)`,
                display:"flex",justifyContent:"space-between",alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(66,133,255,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{ fontWeight:600,fontSize:13,color:C.text }}>{s.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:1 }}>
                  {s.isin||"—"}{s.lot && s.lot > 1 ?` · Lot: ${s.lot}`:""}
                </div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0,marginLeft:12 }}>
                <div style={sBadge(C.blue)}>{s.id}</div>
                {s.s && <div style={{ fontSize:10,color:C.muted,marginTop:3 }}>{s.s}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ADD BOT FORM — exact reference screenshot layout
// ═══════════════════════════════════════════════════════════════════════
const EXCHANGES_LIST = ["NSE_EQ","BSE_EQ","NSE_FNO","NSE_CURRENCY","MCX_COMM"];
const PRODUCT_TYPES  = ["CNC","INTRADAY","MARGIN","MTF","CO","BO"];
const BROKERS = [
  "Dhan","Zerodha","Angel One","Upstox","Fyers","5Paisa","Groww",
  "ICICI Direct","HDFC Securities","Kotak Securities","Sharekhan",
  "Motilal Oswal","Edelweiss","Paytm Money","IIFL Securities",
];
const BROKER_FIELDS = {
  "Dhan":           [{k:"client_id",l:"Client ID"},{k:"access_token",l:"Access Token"},{k:"totp_secret",l:"TOTP Secret (for auto daily refresh)"}],
  "Zerodha":        [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"api_secret",l:"API Secret"},{k:"totp_secret",l:"TOTP Secret"}],
  "Angel One":      [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "Upstox":         [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"api_secret",l:"API Secret"},{k:"totp_secret",l:"TOTP Secret"}],
  "Fyers":          [{k:"client_id",l:"App ID / Client ID"},{k:"secret_key",l:"Secret Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "5Paisa":         [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "Groww":          [{k:"client_id",l:"Client ID"},{k:"access_token",l:"Access Token"}],
  "ICICI Direct":   [{k:"client_id",l:"User ID"},{k:"api_key",l:"API Key"},{k:"api_secret",l:"API Secret"},{k:"totp_secret",l:"TOTP Secret"}],
  "HDFC Securities":[{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "Kotak Securities":[{k:"client_id",l:"Consumer Key"},{k:"api_secret",l:"Consumer Secret"},{k:"totp_secret",l:"TOTP Secret"}],
  "Sharekhan":      [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"api_secret",l:"API Secret"}],
  "Motilal Oswal":  [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "Edelweiss":      [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "Paytm Money":    [{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
  "IIFL Securities":[{k:"client_id",l:"Client ID"},{k:"api_key",l:"API Key"},{k:"totp_secret",l:"TOTP Secret"}],
};

// Exchanges where expiry is NOT applicable
const NO_EXPIRY_EXCHANGES = ["NSE_EQ","BSE_EQ"];

function AddBotForm({ clients, onAdd, onClose }) {
  const [form, setForm] = useState({
    exchange:"NSE_EQ", script:null, expiry:"", client_id:"",
    jobbing_buy:"", jobbing_qty:"", tp_sell:"",
    initial_qty:"0", start_price:"0", lower_limit:"", upper_limit:"",
    product:"CNC",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const expiries    = getExpiries(6);
  const hasExpiry   = !NO_EXPIRY_EXCHANGES.includes(form.exchange);
  const row1Cols    = hasExpiry ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr"; // 3 cols when no expiry
  const canSubmit   = form.script && form.client_id &&
    form.jobbing_buy && form.jobbing_qty &&
    form.lower_limit && form.upper_limit && parseFloat(form.start_price)>0;
  const G4 = { display:"grid", gridTemplateColumns:row1Cols, gap:14, marginBottom:16 };
  const G3 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:16 };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22 }}>
        <div>
          <h2 style={{ margin:0,fontSize:19,fontFamily:"'Syne',sans-serif",color:C.text }}>Add Grid Bot</h2>
          <p style={{ margin:"3px 0 0",fontSize:12,color:C.muted }}>
            All script data from NSE/BSE master · refreshed daily 6:00 AM IST
          </p>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer" }}>×</button>
      </div>

      {/* Row 1: Exchange · Script search · [Expiry — only for FNO/Currency/MCX] · Client */}
      <div style={G4}>
        <div>
          <label style={sLbl}>Exchange</label>
          <select value={form.exchange} onChange={e=>{ set("exchange",e.target.value); set("script",null); set("expiry",""); }}
            style={{ ...sInp, appearance:"none" }}>
            {EXCHANGES_LIST.map(ex=><option key={ex} value={ex}>{ex.replace("_"," ")}</option>)}
          </select>
          {!hasExpiry && (
            <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Equity — no expiry</div>
          )}
        </div>
        <div>
          <label style={sLbl}>Ticker selection</label>
          <ScriptSearch exchange={form.exchange} value={form.script} onChange={s=>set("script",s)}/>
        </div>
        {/* Only show expiry for NSE_FNO, NSE_CURRENCY, MCX_COMM */}
        {hasExpiry && (
          <div>
            <label style={sLbl}>Expiry date</label>
            <select value={form.expiry} onChange={e=>set("expiry",e.target.value)}
              style={{ ...sInp, appearance:"none" }}>
              <option value="">Select expiry</option>
              {expiries.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={sLbl}>Client / User selection</label>
          <select value={form.client_id} onChange={e=>set("client_id",e.target.value)}
            style={{ ...sInp, appearance:"none" }}>
            <option value="">Select client</option>
            {clients.filter(c=>c.active).map(c=>(
              <option key={c.id} value={c.id}>{c.name} · {c.broker}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Script pill */}
      {form.script && (
        <div style={{ background:"rgba(0,201,122,.05)",border:"1px solid rgba(0,201,122,.18)",
          borderRadius:9,padding:"10px 16px",marginBottom:16,
          display:"flex",gap:14,alignItems:"center",flexWrap:"wrap" }}>
          <span style={{ fontWeight:700,fontSize:14 }}>{form.script.name}</span>
          <span style={sBadge(C.blue)}>{form.script.id}</span>
          {form.script.isin&&<span style={{ fontSize:12,color:C.muted }}>ISIN: {form.script.isin}</span>}
          <span style={sBadge(C.amber)}>{form.script.s}</span>
          {form.script.lot&&<span style={sBadge(C.purple)}>Lot: {form.script.lot}</span>}
          <select value={form.product} onChange={e=>set("product",e.target.value)}
            style={{ ...sInp,width:"auto",padding:"4px 10px",fontSize:12 }}>
            {PRODUCT_TYPES.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
      )}

      {/* Row 2: Jobbing interval · Jobbing qty · TP interval */}
      <div style={G3}>
        <div>
          <label style={sLbl}>Jobbing Interval (Buy)</label>
          <input type="number" value={form.jobbing_buy}
            onChange={e=>set("jobbing_buy",e.target.value)}
            placeholder="Enter interval" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Price step between each buy order</div>
        </div>
        <div>
          <label style={sLbl}>Jobbing Qty (No. of shares)</label>
          <input type="number" value={form.jobbing_qty}
            onChange={e=>set("jobbing_qty",e.target.value)}
            placeholder="Enter quantity" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Shares per grid order</div>
        </div>
        <div>
          <label style={sLbl}>Take Profit Interval (Sell)</label>
          <input type="number" value={form.tp_sell}
            onChange={e=>set("tp_sell",e.target.value)}
            placeholder="Enter interval" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Profit target above each buy fill</div>
        </div>
      </div>

      {/* Row 3: Initial Qty · Start Price · Lower · Upper */}
      <div style={G4}>
        <div>
          <label style={sLbl}>Initial Quantity (Shares)</label>
          <input type="number" value={form.initial_qty}
            onChange={e=>set("initial_qty",e.target.value)}
            placeholder="0" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Pre-existing holding to deploy</div>
        </div>
        <div>
          <label style={sLbl}>Start Price (Initial Price)</label>
          <input type="number" value={form.start_price}
            onChange={e=>set("start_price",e.target.value)}
            placeholder="0" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Grid reference / entry price</div>
        </div>
        <div>
          <label style={sLbl}>Lower Limit</label>
          <input type="number" value={form.lower_limit}
            onChange={e=>set("lower_limit",e.target.value)}
            placeholder="Enter lower limit" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Bot stops if price drops below this</div>
        </div>
        <div>
          <label style={sLbl}>Upper Limit</label>
          <input type="number" value={form.upper_limit}
            onChange={e=>set("upper_limit",e.target.value)}
            placeholder="Enter upper limit" style={sInp}/>
          <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>Bot stops if price rises above this</div>
        </div>
      </div>

      {!canSubmit && (
        <div style={{ fontSize:12,color:C.amber,marginBottom:12 }}>
          ⚠ Fill exchange, script, client, jobbing interval, qty and all price fields to proceed
        </div>
      )}

      <div style={{ display:"flex",justifyContent:"flex-end",gap:10,
        borderTop:`1px solid ${C.border}`,paddingTop:16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{
          if(!canSubmit) return;
          const cl=clients.find(c=>c.id===form.client_id);
          onAdd({
            id:Date.now(), exchange:form.exchange, ticker:form.script.name,
            security_id:form.script.id, isin:form.script.isin||"",
            client:cl?.name||"", client_id:form.client_id, broker:cl?.broker||"",
            status:"IDLE", pnl:0, orders:0,
            grid_step:parseFloat(form.jobbing_buy)||5,
            tp_interval:parseFloat(form.tp_sell)||0,
            trade_qty:parseInt(form.jobbing_qty)||1,
            initial_qty:parseInt(form.initial_qty)||0,
            start_price:parseFloat(form.start_price)||0,
            lower_limit:parseFloat(form.lower_limit)||0,
            upper_limit:parseFloat(form.upper_limit)||0,
            product:form.product, expiry:form.expiry,
          });
          onClose();
        }} disabled={!canSubmit}>Add Grid Bot</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CLIENT FORM
// ═══════════════════════════════════════════════════════════════════════
function AddClientForm({ onAdd, onClose, editData=null }) {
  const [form, setForm] = useState(editData||{
    name:"", broker:"Dhan", segment:"NSE_EQ", note:"",
    credentials:{ client_id:"", access_token:"", api_key:"", api_secret:"", secret_key:"", totp_secret:"" },
  });
  const [show, setShow] = useState({});
  const set  = (k,v) => setForm(f=>({...f,[k]:v}));
  const cred = (k,v) => setForm(f=>({...f,credentials:{...f.credentials,[k]:v}}));
  const fields = BROKER_FIELDS[form.broker]||BROKER_FIELDS["Dhan"];
  const hasTOTP = fields.some(f=>f.k==="totp_secret");

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22 }}>
        <div>
          <h2 style={{ margin:0,fontSize:19,fontFamily:"'Syne',sans-serif" }}>{editData?"Edit client":"Add client"}</h2>
          <p style={{ margin:"3px 0 0",fontSize:12,color:C.muted }}>AES-256 encrypted · TOTP auto-refresh 8:00 AM IST</p>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer" }}>×</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <div><label style={sLbl}>Full name</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Client full name" style={sInp}/></div>
        <div><label style={sLbl}>Broker</label>
          <select value={form.broker} onChange={e=>set("broker",e.target.value)} style={{ ...sInp,appearance:"none" }}>
            {BROKERS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div><label style={sLbl}>Default segment</label>
          <select value={form.segment} onChange={e=>set("segment",e.target.value)} style={{ ...sInp,appearance:"none" }}>
            {EXCHANGES_LIST.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
        </div>
        <div><label style={sLbl}>Note</label><input value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Optional note" style={sInp}/></div>
      </div>

      <div style={{ background:"rgba(255,255,255,.02)",border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:14 }}>
        <div style={{ fontSize:12,fontWeight:600,color:C.blue,marginBottom:14 }}>🔐 {form.broker} credentials — encrypted storage</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {fields.map(f=>(
            <div key={f.k}>
              <label style={sLbl}>{f.l}</label>
              <div style={{ position:"relative" }}>
                <input type={show[f.k]?"text":"password"} value={form.credentials[f.k]||""}
                  onChange={e=>cred(f.k,e.target.value)}
                  placeholder={`Enter ${f.l.toLowerCase()}`}
                  style={{ ...sInp,paddingRight:56,
                    fontFamily:show[f.k]?"'DM Mono',monospace":"inherit",
                    fontSize:show[f.k]?11:13 }}/>
                <button onClick={()=>setShow(s=>({...s,[f.k]:!s[f.k]}))} style={{
                  position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:`1px solid ${C.hint}`,borderRadius:4,
                  color:C.muted,fontSize:10,padding:"2px 7px",cursor:"pointer" }}>
                  {show[f.k]?"hide":"show"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasTOTP && (
        <div style={{ background:"rgba(245,166,35,.06)",border:"1px solid rgba(245,166,35,.18)",
          borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,
          color:"rgba(245,166,35,.9)",lineHeight:1.7 }}>
          <strong>TOTP Secret → Automatic token refresh at 8:00 AM IST daily</strong><br/>
          Your backend uses this base32 TOTP seed to generate the 6-digit OTP automatically every morning,
          logs in and refreshes the access token — <em>no manual action needed from account holder.</em><br/>
          All times use <strong>Indian Standard Time (IST, UTC+5:30)</strong>.
        </div>
      )}

      <div style={{ display:"flex",justifyContent:"flex-end",gap:10,borderTop:`1px solid ${C.border}`,paddingTop:16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{
          if(!form.name||!form.credentials.client_id) return;
          onAdd({
            id: editData?.id || null,
            ...form,
            active: true,
            added: new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"}),
            bots: editData?.bots||0,
            pnl: editData?.pnl||0,
          });
          onClose();
        }} disabled={!form.name||!form.credentials.client_id}>
          {editData?"Save changes":"Add client"}
        </Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  KILL SWITCH MODAL
// ═══════════════════════════════════════════════════════════════════════
function KillSwitchModal({ open, onClose, onKillAll, onKillBot, bots }) {
  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40,marginBottom:12 }}>🛑</div>
        <h2 style={{ margin:"0 0 8px",fontSize:20,fontFamily:"'Syne',sans-serif",color:C.red }}>Kill Switch</h2>
        <p style={{ fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.6 }}>
          This will immediately cancel all open orders and square off all positions for the selected bots.
          <br/><strong style={{ color:C.red }}>This action cannot be undone. IST time will be logged.</strong>
        </p>
        <Btn variant="kill" onClick={()=>{ onKillAll(); onClose(); }}
          style={{ width:"100%",padding:"14px",fontSize:15,marginBottom:14 }}>
          ⚡ KILL ALL BOTS — Square off everything
        </Btn>
        <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:14 }}>
          <div style={{ fontSize:11,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em" }}>
            Or kill individual bot
          </div>
          {bots.filter(b=>b.status==="RUNNING"||b.status==="PAUSED").map(b=>(
            <div key={b.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"8px 12px",background:"rgba(255,255,255,.03)",borderRadius:8,marginBottom:8 }}>
              <div>
                <span style={{ fontWeight:600 }}>{b.ticker}</span>
                <span style={{ fontSize:12,color:C.muted,marginLeft:8 }}>{b.client} · {b.product}</span>
              </div>
              <Btn variant="danger" style={{ padding:"5px 12px",fontSize:12 }}
                onClick={()=>{ onKillBot(b.id); onClose(); }}>
                Kill
              </Btn>
            </div>
          ))}
          {bots.filter(b=>b.status==="RUNNING"||b.status==="PAUSED").length===0 && (
            <div style={{ fontSize:13,color:C.muted,padding:"12px 0" }}>No active bots to kill.</div>
          )}
        </div>
        <Btn variant="ghost" onClick={onClose} style={{ marginTop:14,width:"100%" }}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  HOLDINGS TAB
// ═══════════════════════════════════════════════════════════════════════
function HoldingsTab({ clients }) {
  const [selClient, setSelClient] = useState(clients[0]?.id||"");
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(()=>{
    if (!selClient) return;
    setLoading(true); setError("");
    apiCall("GET", `/api/clients/${selClient}/holdings`).then(data=>{
      if (data?.ok) {
        // Backend returns normalized shape — no field-name guessing needed.
        const mapped = (data.holdings||[]).map(h=>({
          script:   h.tradingSymbol,
          sid:      h.securityId,
          isin:     h.isin || "—",
          buyQty:   h.totalQty,
          sellQty:  0, // holdings have no sell qty; that's a positions concept
          buyRate:  h.avgCostPrice,
          sellRate: 0,
          netQty:   h.availableQty || h.totalQty,
          pnl:      h.pnl,
          pnlPct:   h.pnlPct,
          ltp:      h.lastTradedPrice,
        }));
        setHoldings(mapped);
      } else {
        setError(data?.error||"Could not fetch holdings. Check your Dhan access token.");
      }
      setLoading(false);
    }).catch(()=>{ setError("Network error"); setLoading(false); });
  },[selClient]);

  const totalPnl = holdings.reduce((s,h)=>s+h.pnl, 0);

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Holdings</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Live CNC delivery positions from Dhan · IST</p>
        </div>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <select value={selClient} onChange={e=>setSelClient(e.target.value)}
            style={{ ...sInp,width:"auto",padding:"8px 14px" }}>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.broker}</option>)}
          </select>
          <div style={{ background:"rgba(0,201,122,.07)",border:"1px solid rgba(0,201,122,.2)",
            borderRadius:9,padding:"8px 16px",textAlign:"right" }}>
            <div style={{ fontSize:10,color:C.muted }}>Total P&L</div>
            <div style={{ fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",
              color:totalPnl>=0?C.green:C.red }}>
              {totalPnl>=0?"+":""}₹{Math.abs(totalPnl).toLocaleString("en-IN",{maximumFractionDigits:2})}
            </div>
          </div>
        </div>
      </div>
      {error && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.red }}>⚠ {error}</div>}
      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.muted }}>Fetching holdings from Dhan...</div>}
      {!loading && (
        <div style={sCard}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:720 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Script Name","Security ID","ISIN","Buy Qty","Sell Qty","Buy Rate","Sell Rate","Net Qty","LTP","P&L"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {holdings.map((h,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 10px",fontWeight:600 }}>{h.script}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{h.sid}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:11 }}>{h.isin}</td>
                    <td style={{ padding:"11px 10px",color:C.green,fontFamily:"'DM Mono',monospace" }}>{h.buyQty}</td>
                    <td style={{ padding:"11px 10px",color:C.red,fontFamily:"'DM Mono',monospace" }}>{h.sellQty||"—"}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{h.buyRate.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>{h.sellRate>0?`₹${h.sellRate.toLocaleString("en-IN")}`:"—"}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:h.netQty>0?C.green:h.netQty<0?C.red:C.muted,fontWeight:600 }}>{h.netQty}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{h.ltp.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700,color:h.pnl>=0?C.green:C.red }}>
                      {h.pnl>=0?"+":""}₹{Math.abs(h.pnl).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                {holdings.length===0 && <tr><td colSpan={10} style={{ padding:"32px",textAlign:"center",color:C.muted }}>No holdings found for this client.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop:10,fontSize:11,color:C.muted }}>* Live data from Dhan get_holdings() API · All timestamps IST</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  POSITIONS TAB
// ═══════════════════════════════════════════════════════════════════════
function PositionsTab({ clients }) {
  const [selClient, setSelClient] = useState(clients[0]?.id||"");
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(()=>{
    if (!selClient) return;
    setLoading(true); setError("");
    apiCall("GET", `/api/clients/${selClient}/positions`).then(data=>{
      if (data?.ok) {
        const mapped = (data.positions||[]).map(p=>({
          script:   p.tradingSymbol,
          sid:      p.securityId,
          type:     p.type,             // backend already classifies EQ/FUT/OPT
          buyQty:   p.buyQty,
          sellQty:  p.sellQty,
          buyRate:  p.buyAvg,
          sellRate: p.sellAvg,
          netQty:   p.netQty,
          pnl:      p.pnl,              // realized + unrealized
          ltp:      p.lastTradedPrice,
        }));
        setPositions(mapped);
      } else {
        setError(data?.error||"Could not fetch positions.");
      }
      setLoading(false);
    }).catch(()=>{ setError("Network error"); setLoading(false); });
  },[selClient]);

  const totalPnl = positions.reduce((s,p)=>s+p.pnl,0);

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Positions</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Live intraday + carry-forward from Dhan · IST</p>
        </div>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <select value={selClient} onChange={e=>setSelClient(e.target.value)} style={{ ...sInp,width:"auto",padding:"8px 14px" }}>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.broker}</option>)}
          </select>
          <div style={{ background:"rgba(0,201,122,.07)",border:"1px solid rgba(0,201,122,.2)",borderRadius:9,padding:"8px 16px" }}>
            <div style={{ fontSize:10,color:C.muted }}>Unrealized P&L</div>
            <div style={{ fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:totalPnl>=0?C.green:C.red }}>
              {totalPnl>=0?"+":""}₹{Math.abs(totalPnl).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>
      {error && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.red }}>⚠ {error}</div>}
      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.muted }}>Fetching positions from Dhan...</div>}
      {!loading && (
        <div style={sCard}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:720 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Script Name","Sec ID","Type","Buy Qty","Sell Qty","Buy Rate","Sell Rate","Net Qty","LTP","P&L"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {positions.map((p,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 10px",fontWeight:600 }}>{p.script}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{p.sid}</td>
                    <td style={{ padding:"11px 10px" }}><span style={sBadge(p.type==="EQ"?C.blue:C.purple)}>{p.type}</span></td>
                    <td style={{ padding:"11px 10px",color:C.green,fontFamily:"'DM Mono',monospace" }}>{p.buyQty||"—"}</td>
                    <td style={{ padding:"11px 10px",color:C.red,fontFamily:"'DM Mono',monospace" }}>{p.sellQty||"—"}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>{p.buyRate>0?`₹${p.buyRate.toLocaleString("en-IN")}`:"—"}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>{p.sellRate>0?`₹${p.sellRate.toLocaleString("en-IN")}`:"—"}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:p.netQty>0?C.green:p.netQty<0?C.red:C.muted,fontWeight:600 }}>{p.netQty}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{p.ltp.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700,color:p.pnl>=0?C.green:C.red }}>
                      {p.pnl>=0?"+":""}₹{Math.abs(p.pnl).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                {positions.length===0 && <tr><td colSpan={10} style={{ padding:"32px",textAlign:"center",color:C.muted }}>No open positions for this client.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LIMIT WINDOW
// ═══════════════════════════════════════════════════════════════════════
function LimitTab({ clients }) {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(()=>{
    const active = clients.filter(c=>c.active);
    if (!active.length) return;
    setLoading(true); setError("");
    Promise.all(active.map(c=>
      apiCall("GET", `/api/clients/${c.id}/limits`).then(data=>({ client:c, limits:data?.limits||{}, ok:data?.ok }))
    )).then(results=>{
      const mapped = results.map(r=>{
        const l = r.limits;
        // Backend already maps Dhan's typo ("availabelBalance") → availableBalance
        const available  = l.availableBalance    || 0;
        const sod        = l.sodLimit            || 0;
        const used       = l.utilizedAmount      || 0;
        const collateral = l.collateralAmount    || 0;
        const withdraw   = l.withdrawableBalance || 0;
        return {
          code:            r.client.credentials?.client_id || "—",
          name:            r.client.name,
          broker:          r.client.broker,
          available, sod, used, collateral, withdraw,
          // Sensible % bar: how much of opening limit is still free
          pct_available:   sod > 0 ? Math.max(0, Math.min(100, (available / sod) * 100)) : 0,
        };
      });
      setLimits(mapped);
      setLoading(false);
    }).catch(()=>{ setError("Could not fetch limits"); setLoading(false); });
  },[clients.length]);

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Limit window</h1>
        <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Live margin data from broker API · IST</p>
      </div>
      {error && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.red }}>⚠ {error}</div>}
      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.muted }}>Fetching margin limits from brokers...</div>}
      {!loading && (
        <div style={sCard}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:780 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Client Code","Name","Broker","Available","SoD Limit","Utilized","Collateral","Withdrawable","% Free"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {limits.map((l,i)=>{
                  const pctCol=l.pct_available>60?C.green:l.pct_available>30?C.amber:C.red;
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{l.code}</td>
                      <td style={{ padding:"11px 10px",fontWeight:600 }}>{l.name}</td>
                      <td style={{ padding:"11px 10px" }}><span style={sBadge(C.blue)}>{l.broker}</span></td>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.green,fontWeight:600 }}>₹{l.available.toLocaleString("en-IN",{maximumFractionDigits:2})}</td>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{l.sod.toLocaleString("en-IN",{maximumFractionDigits:2})}</td>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.red }}>₹{l.used.toLocaleString("en-IN",{maximumFractionDigits:2})}</td>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{l.collateral.toLocaleString("en-IN",{maximumFractionDigits:2})}</td>
                      <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{l.withdraw.toLocaleString("en-IN",{maximumFractionDigits:2})}</td>
                      <td style={{ padding:"11px 10px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ flex:1,height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden",minWidth:60 }}>
                            <div style={{ height:"100%",width:`${l.pct_available}%`,background:pctCol,borderRadius:3 }}/>
                          </div>
                          <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:pctCol,minWidth:38 }}>{l.pct_available.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {limits.length===0 && <tr><td colSpan={9} style={{ padding:"32px",textAlign:"center",color:C.muted }}>No active clients found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop:10,fontSize:11,color:C.muted }}>* Live data from Dhan /v2/fundlimit · All timestamps IST</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DEMO TAB
// ═══════════════════════════════════════════════════════════════════════
function DemoTab() {
  const [cfg, setCfg] = useState({ grid_step:5, trade_qty:2, reentry_drop:5 });
  const [running, setRunning] = useState(false);
  const [ltp, setLtp] = useState(2835.0);
  const [state, setState] = useState({ active:false,position_qty:0,buy_price:null,sell_price:null,buy_order_id:null,sell_order_id:null,waiting_reentry:false });
  const [orders, setOrders] = useState([]);
  const [actLog, setActLog] = useState([]);
  const [pnl, setPnl] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [hist, setHist] = useState([2835]);
  const timer = useRef(null);
  const r = useRef({ state, ltp, orders });
  useEffect(()=>{ r.current={state,ltp,orders}; });

  const istNow = () => new Date().toLocaleTimeString("en-IN",{ timeZone:"Asia/Kolkata", hour12:false });
  const addLog = (msg,type="info") => setActLog(l=>[{t:istNow(),msg,type},...l].slice(0,50));

  const placeGrid = (ref,qty) => {
    const bp=+(ref-cfg.grid_step).toFixed(2), sp=+(ref+cfg.grid_step).toFixed(2);
    const bid="B"+Date.now(), sid="S"+Date.now();
    setOrders(prev=>[...prev.filter(o=>o.status!=="OPEN"),
      {id:bid,side:"BUY",price:bp,qty:cfg.trade_qty,status:"OPEN",product:"CNC",time:istNow()},
      {id:sid,side:"SELL",price:sp,qty:cfg.trade_qty,status:"OPEN",product:"CNC",time:istNow()},
    ]);
    setState(s=>({...s,active:true,position_qty:qty,buy_order_id:bid,sell_order_id:sid,buy_price:bp,sell_price:sp,waiting_reentry:false}));
    addLog(`GRID: SELL @ ₹${sp} | Ref ₹${ref} | BUY @ ₹${bp}`,"info");
  };

  const start = () => {
    const sp=r.current.ltp;
    addLog("=== DHAN GRID BOT CNC · NSE_EQ · BSE Limited 19585 ===","info");
    addLog(`IST: ${istNow()} · Step ₹${cfg.grid_step} · Qty ${cfg.trade_qty}`,"info");
    addLog(`Market BUY ${cfg.trade_qty} @ ₹${sp.toFixed(2)} CNC`,"buy");
    setOrders([{id:"I"+Date.now(),side:"BUY",price:sp,qty:cfg.trade_qty,status:"FILLED",product:"CNC",time:istNow()}]);
    placeGrid(sp,cfg.trade_qty);
    setRunning(true);
    timer.current = setInterval(()=>{
      const prev=r.current.ltp;
      const nl=Math.max(2650,Math.min(3100,+(prev+(Math.random()-.499)*cfg.grid_step*1.2).toFixed(2)));
      setLtp(nl); setHist(h=>[...h,nl].slice(-80));
      const s=r.current.state; const co=r.current.orders;
      if(!s.active||s.waiting_reentry) return;
      const bo=co.find(o=>o.id===s.buy_order_id&&o.status==="OPEN");
      const so=co.find(o=>o.id===s.sell_order_id&&o.status==="OPEN");
      if(bo&&nl<=bo.price){
        addLog(`BUY FILLED ₹${bo.price} → new grid`,"buy");
        setOrders(p=>p.map(o=>o.id===bo.id?{...o,status:"FILLED"}:o.id===s.sell_order_id?{...o,status:"CANCELLED"}:o));
        const nq=s.position_qty+cfg.trade_qty;
        setState(prev=>({...prev,last_fill:bo.price,position_qty:nq}));
        setTimeout(()=>placeGrid(bo.price,nq),400);
      } else if(so&&nl>=so.price){
        const profit=cfg.grid_step*cfg.trade_qty*2;
        addLog(`SELL FILLED ₹${so.price} → +₹${profit}`,"sell");
        setPnl(p=>+(p+profit).toFixed(2)); setCycles(c=>c+1);
        setOrders(p=>p.map(o=>o.id===so.id?{...o,status:"FILLED"}:o.id===s.buy_order_id?{...o,status:"CANCELLED"}:o));
        const nq=s.position_qty-cfg.trade_qty;
        if(nq<=0){
          addLog(`ALL SOLD. 1-min re-entry watch (IST).`,"warn");
          setState(prev=>({...prev,position_qty:0,active:false,waiting_reentry:true}));
          setTimeout(()=>{ addLog(`RE-ENTRY triggered. Market BUY ${cfg.trade_qty}.`,"buy"); placeGrid(r.current.ltp,cfg.trade_qty); },4500);
          return;
        }
        setState(prev=>({...prev,position_qty:nq}));
        setTimeout(()=>placeGrid(so.price,nq),400);
      }
    },700);
  };

  const stop=()=>{ clearInterval(timer.current);setRunning(false);
    addLog(`Bot stopped IST ${istNow()}. ${r.current.state.position_qty} shares in Demat.`,"warn");
    setOrders(p=>p.map(o=>o.status==="OPEN"?{...o,status:"CANCELLED"}:o));
    setState(s=>({...s,active:false}));
  };
  const reset=()=>{ clearInterval(timer.current);setRunning(false);
    setLtp(2835);setHist([2835]);setPnl(0);setCycles(0);setOrders([]);setActLog([]);
    setState({active:false,position_qty:0,buy_price:null,sell_price:null,buy_order_id:null,sell_order_id:null,waiting_reentry:false});
  };

  const chart=()=>{
    const pts=hist; if(pts.length<2) return null;
    const W=400,H=52,mn=Math.min(...pts),mx=Math.max(...pts,mn+5);
    const xs=pts.map((_,i)=>i*(W/(pts.length-1)));
    const ys=pts.map(p=>H-4-((p-mn)/(mx-mn))*(H-10));
    const d=xs.map((x,i)=>`${i===0?"M":"L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const col=pnl>=0?C.green:C.red;
    const bpY=state.buy_price?H-4-((state.buy_price-mn)/(mx-mn))*(H-10):null;
    const spY=state.sell_price?H-4-((state.sell_price-mn)/(mx-mn))*(H-10):null;
    return (<svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d+` L${W},${H} L0,${H} Z`} fill={col} opacity=".07"/>
      <path d={d} fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {bpY&&<line x1="0" x2={W} y1={bpY} y2={bpY} stroke={C.green} strokeWidth=".8" strokeDasharray="4 3" opacity=".7"/>}
      {spY&&<line x1="0" x2={W} y1={spY} y2={spY} stroke={C.red} strokeWidth=".8" strokeDasharray="4 3" opacity=".7"/>}
    </svg>);
  };

  const lCol={buy:C.green,sell:C.red,warn:C.amber,info:"rgba(255,255,255,.4)"};
  return (
    <div>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:12 }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <span style={{ fontSize:20,fontWeight:700,fontFamily:"'Syne',sans-serif",letterSpacing:"-.02em" }}>BSE LIMITED</span>
            <span style={sBadge(C.blue)}>NSE_EQ</span>
            <span style={sBadge("rgba(255,255,255,.5)")}>19585</span>
            <span style={{ ...sBadge("rgba(255,255,255,.3)"),fontSize:10 }}>INE118H01025</span>
            <span style={sBadge(C.amber)}>CNC</span>
            <span style={sBadge(running?C.green:C.muted)}>{running?"● LIVE SIM":"○ STOPPED"}</span>
          </div>
          <div style={{ fontSize:12,color:C.muted,marginTop:4 }}>Paper trade · mirrors grid_bot_cnc.py · Dhan · All times IST</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:28,fontWeight:700,fontFamily:"'DM Mono',monospace",color:ltp>2835?C.red:C.green,lineHeight:1 }}>₹{ltp.toLocaleString("en-IN",{maximumFractionDigits:2})}</div>
          <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>IST {istNow()}</div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14 }}>
        {[
          {l:"Realized P&L",v:`${pnl>=0?"+":""}₹${pnl}`,c:pnl>=0?C.green:C.red},
          {l:"Cycles",v:cycles,c:C.text},
          {l:"Position",v:`${state.position_qty} sh`,c:C.text},
          {l:"Buy order",v:state.buy_price?`₹${state.buy_price}`:"—",c:C.green},
          {l:"Sell order",v:state.sell_price?`₹${state.sell_price}`:"—",c:C.red},
        ].map(({l,v,c})=>(
          <div key={l} style={{ ...sCard,padding:"12px 14px" }}>
            <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:16,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1.7fr 1fr",gap:14,marginBottom:14 }}>
        <div style={sCard}>
          <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8 }}>Price chart · last 80 ticks</div>
          {chart()}
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,fontFamily:"'DM Mono',monospace",color:C.muted }}>
            <span style={{ color:C.green }}>BUY {state.buy_price?`₹${state.buy_price}`:"—"}</span>
            <span style={{ color:C.amber }}>₹{ltp.toLocaleString("en-IN",{maximumFractionDigits:2})}</span>
            <span style={{ color:C.red }}>SELL {state.sell_price?`₹${state.sell_price}`:"—"}</span>
          </div>
        </div>
        <div style={sCard}>
          <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12 }}>Grid config</div>
          {[{l:"Grid step (₹)",k:"grid_step"},{l:"Trade qty",k:"trade_qty"},{l:"Re-entry drop (₹)",k:"reentry_drop"}].map(({l,k})=>(
            <div key={k} style={{ marginBottom:10 }}>
              <label style={sLbl}>{l}</label>
              <input type="number" value={cfg[k]} onChange={e=>setCfg(c=>({...c,[k]:+e.target.value}))}
                disabled={running} style={{ ...sInp,opacity:running?.5:1 }}/>
            </div>
          ))}
          <div style={{ fontSize:11,color:C.muted }}>Profit/cycle = ₹{cfg.grid_step*2*cfg.trade_qty}</div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <div style={sCard}>
          <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>Recent orders</div>
          {[...orders].reverse().slice(0,8).length===0
            ?<div style={{ fontSize:12,color:"rgba(255,255,255,.2)",textAlign:"center",padding:"18px 0" }}>No orders</div>
            :<table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Side","Price","Qty","Status"].map(h=><th key={h} style={{ textAlign:"left",padding:"4px 6px",fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:500 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[...orders].reverse().slice(0,8).map(o=>{
                  const sc={FILLED:C.green,OPEN:C.amber,CANCELLED:C.muted}[o.status];
                  return (<tr key={o.id} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}>
                    <td style={{ padding:"6px 6px" }}><span style={sBadge(o.side==="BUY"?C.green:C.red)}>{o.side}</span></td>
                    <td style={{ padding:"6px 6px",fontFamily:"'DM Mono',monospace",fontSize:12 }}>₹{o.price.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"6px 6px",color:C.muted }}>{o.qty}</td>
                    <td style={{ padding:"6px 6px" }}><span style={sBadge(sc)}>{o.status}</span></td>
                  </tr>);
                })}
              </tbody>
            </table>
          }
        </div>
        <div style={{ ...sCard,maxHeight:240,overflowY:"auto" }}>
          <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>Activity log (IST)</div>
          {actLog.length===0?<div style={{ fontSize:12,color:"rgba(255,255,255,.2)" }}>Press Start...</div>
            :actLog.map((l,i)=>(
              <div key={i} style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:lCol[l.type],marginBottom:3,lineHeight:1.5 }}>
                [{l.t}] {l.msg}
              </div>
            ))}
        </div>
      </div>
      <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:10 }}>
        {!running?<Btn onClick={start}>▶ Start bot</Btn>:<Btn variant="danger" onClick={stop}>⏹ Stop</Btn>}
        <Btn variant="ghost" onClick={reset}>↺ Reset</Btn>
        <span style={{ fontSize:12,color:C.muted }}>EOD auto-cancel 15:20 IST · All timestamps IST</span>
      </div>
      <div style={{ padding:"10px 14px",background:"rgba(245,166,35,.05)",border:`1px solid rgba(245,166,35,.12)`,
        borderRadius:8,fontSize:12,color:"rgba(245,166,35,.6)" }}>
        ⚠ Paper trade — no real orders. Mirrors grid_bot_cnc.py · BSE Limited · NSE_EQ · CNC · Script 19585 · INE118H01025
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════
function OrdersTab({ clients, filter, onFilterChange }) {
  const [selClient, setSelClient] = useState(clients[0]?.id || "");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const load = useCallback(() => {
    if (!selClient) { setOrders([]); return; }
    setLoading(true); setError(""); setWarning("");
    apiCall("GET", `/api/orders?client_id=${selClient}&source=both&limit=500`).then(data=>{
      if (data?.ok) {
        setOrders(data.orders || []);
        if (data.warning) setWarning(data.warning);
      } else {
        setError(data?.error || "Could not fetch orders.");
      }
      setLoading(false);
    }).catch(()=>{ setError("Network error"); setLoading(false); });
  }, [selClient]);

  useEffect(()=>{ load(); }, [load]);
  useEffect(()=>{
    if (!selClient) return;
    const t = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(t);
  }, [selClient, load]);

  const filtered = filter === "ALL"
    ? orders
    : orders.filter(o => o.bucket === filter);

  const statusColor = (b) => b === "FILLED" ? C.green : b === "OPEN" ? C.amber : b === "CANCELLED" ? C.red : C.muted;

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Order history</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Live broker orderbook + bot orders · IST · auto-refresh 10s</p>
        </div>
        <select value={selClient} onChange={e=>setSelClient(e.target.value)}
          style={{ ...sInp,width:"auto",padding:"8px 14px" }}>
          {clients.length === 0 && <option value="">No clients</option>}
          {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.broker}</option>)}
        </select>
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
        {["ALL","FILLED","OPEN","CANCELLED"].map(f=>{
          const n = f === "ALL" ? orders.length : orders.filter(o => o.bucket === f).length;
          return (
            <button key={f} onClick={()=>onFilterChange(f)} style={{
              padding:"6px 14px",borderRadius:7,border:`1px solid`,
              borderColor:filter===f?C.blue:C.hint,
              background:filter===f?"rgba(66,133,255,.12)":"transparent",
              color:filter===f?C.blue:C.muted,
              cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"inherit" }}>
              {f} {orders.length > 0 && <span style={{ opacity:.6,marginLeft:4 }}>({n})</span>}
            </button>
          );
        })}
      </div>

      {error   && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.red }}>⚠ {error}</div>}
      {warning && <div style={{ background:"rgba(245,166,35,.08)",border:"1px solid rgba(245,166,35,.25)",borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.amber }}>⚠ {warning}</div>}

      {loading && orders.length === 0 ? (
        <div style={{ textAlign:"center",padding:"40px",color:C.muted }}>Fetching orders…</div>
      ) : (
        <div style={sCard}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:900 }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Time (IST)","Symbol","Side","Type","Product","Qty","Price","Fill Px","Status","Source","Order ID"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((o,i)=>(
                  <tr key={(o.order_id||i)+"-"+i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"9px 10px",fontFamily:"'DM Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap" }}>
                      {o.placed_at_ist || "—"}
                    </td>
                    <td style={{ padding:"9px 10px",fontWeight:600 }}>
                      {o.ticker || o.security_id}
                      <div style={{ fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace" }}>{o.security_id}</div>
                    </td>
                    <td style={{ padding:"9px 10px" }}>
                      <span style={sBadge(o.side==="BUY"?C.green:C.red)}>{o.side}</span>
                    </td>
                    <td style={{ padding:"9px 10px",fontSize:12,color:C.muted }}>{o.order_type}</td>
                    <td style={{ padding:"9px 10px" }}><span style={sBadge(C.amber)}>{o.product}</span></td>
                    <td style={{ padding:"9px 10px",fontFamily:"'DM Mono',monospace" }}>{o.qty}</td>
                    <td style={{ padding:"9px 10px",fontFamily:"'DM Mono',monospace" }}>{o.price > 0 ? `₹${o.price.toLocaleString("en-IN",{maximumFractionDigits:2})}` : "—"}</td>
                    <td style={{ padding:"9px 10px",fontFamily:"'DM Mono',monospace",color:o.fill_price>0?C.green:C.muted }}>
                      {o.fill_price > 0 ? `₹${o.fill_price.toLocaleString("en-IN",{maximumFractionDigits:2})}` : "—"}
                    </td>
                    <td style={{ padding:"9px 10px" }} title={o.error||""}>
                      <span style={sBadge(statusColor(o.bucket))}>{o.status}</span>
                    </td>
                    <td style={{ padding:"9px 10px",fontSize:10,color:C.muted }}>
                      <span style={sBadge(o.source==="live"?C.blue:C.purple)}>{o.source}</span>
                    </td>
                    <td style={{ padding:"9px 10px",fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted }}>{o.order_id || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding:"32px",textAlign:"center",color:C.muted }}>
                    {orders.length === 0 ? "No orders for this client yet." : `No orders match the ${filter} filter.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LOGS TAB — terminal/table toggle, level + search filter
// ═══════════════════════════════════════════════════════════════════════
function LogsTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel]     = useState("");
  const [query, setQuery]     = useState("");
  const [view, setView]       = useState("terminal"); // "terminal" | "table"
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats]     = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: "500" });
    if (level) qs.set("level", level);
    if (query) qs.set("q", query);
    apiCall("GET", `/api/logs?${qs}`).then(data => {
      if (data?.ok) setLogs(data.logs || []);
      setLoading(false);
    });
    apiCall("GET", "/api/logs/stats").then(data => {
      if (data?.ok) setStats(data.last24h || []);
    });
  }, [level, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const levelColor = (l) => ({
    error: C.red, warn: C.amber, info: C.blue, debug: C.muted, verbose: C.purple,
  }[l] || C.muted);

  const errs = stats.find(s => s.level === "error")?.n || 0;
  const wrns = stats.find(s => s.level === "warn")?.n || 0;
  const infs = stats.find(s => s.level === "info")?.n || 0;

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Backend logs</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>
            Last 24h: <span style={{color:C.red}}>{errs} err</span> · <span style={{color:C.amber}}>{wrns} warn</span> · <span style={{color:C.blue}}>{infs} info</span>
          </p>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <Btn variant={view==="terminal"?"primary":"ghost"} onClick={()=>setView("terminal")} style={{ padding:"6px 14px",fontSize:12 }}>Terminal</Btn>
          <Btn variant={view==="table"?"primary":"ghost"} onClick={()=>setView("table")} style={{ padding:"6px 14px",fontSize:12 }}>Table</Btn>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center" }}>
        <select value={level} onChange={e=>setLevel(e.target.value)}
          style={{ ...sInp,width:"auto",padding:"7px 12px" }}>
          <option value="">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Search messages…"
          style={{ ...sInp, maxWidth:280, padding:"7px 12px" }}/>
        <label style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.muted,cursor:"pointer" }}>
          <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} />
          Auto-refresh 5s
        </label>
        <Btn variant="ghost" onClick={load} style={{ padding:"5px 12px",fontSize:12 }}>Refresh now</Btn>
        <span style={{ fontSize:11,color:C.muted,marginLeft:"auto" }}>
          {loading ? "Loading…" : `${logs.length} entries`}
        </span>
      </div>

      {view === "terminal" ? (
        <div style={{ ...sCard, padding:0, overflow:"hidden" }}>
          <div style={{ background:"#000", padding:"14px 16px", maxHeight:"calc(100vh - 280px)",
                        overflowY:"auto", fontFamily:"'DM Mono',monospace", fontSize:12, lineHeight:1.55 }}>
            {logs.length === 0 && (
              <div style={{ color:C.muted, textAlign:"center", padding:"32px" }}>No log entries.</div>
            )}
            {logs.map(l => (
              <div key={l.id} style={{ display:"flex",gap:10,padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,.02)" }}>
                <span style={{ color:"rgba(255,255,255,.3)",flexShrink:0 }}>{l.ist_timestamp}</span>
                <span style={{ color:levelColor(l.level),flexShrink:0,width:50,textTransform:"uppercase",fontWeight:600 }}>
                  {l.level}
                </span>
                <span style={{ color:"#e2e5f1",wordBreak:"break-word" }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={sCard}>
          <div style={{ overflowX:"auto",maxHeight:"calc(100vh - 280px)",overflowY:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
              <thead style={{ position:"sticky",top:0,background:C.card,zIndex:1 }}>
                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {["Time (IST)","Level","Message"].map(h=>(
                    <th key={h} style={{ textAlign:"left",padding:"8px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}>
                    <td style={{ padding:"7px 10px",fontFamily:"'DM Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap" }}>{l.ist_timestamp}</td>
                    <td style={{ padding:"7px 10px" }}><span style={sBadge(levelColor(l.level))}>{l.level}</span></td>
                    <td style={{ padding:"7px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,wordBreak:"break-word" }}>{l.message}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={3} style={{ padding:"32px",textAlign:"center",color:C.muted }}>No log entries.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ACCOUNT TAB — profile + change password
// ═══════════════════════════════════════════════════════════════════════
function AccountTab({ user, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [name, setName]       = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [curPw, setCurPw]   = useState("");
  const [newPw, setNewPw]   = useState("");
  const [confPw, setConfPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg]   = useState("");
  const [pwErr, setPwErr]   = useState("");

  useEffect(() => {
    apiCall("GET", "/api/auth/me").then(data => {
      if (data?.ok) {
        setProfile(data.user);
        setName(data.user.name || "");
      }
    });
  }, []);

  const saveName = async () => {
    if (!name.trim()) return;
    setSavingName(true); setNameMsg("");
    const data = await apiCall("PUT", "/api/auth/profile", { name: name.trim() });
    setSavingName(false);
    if (data?.ok) {
      setProfile(data.user);
      onUserUpdate?.(data.user);
      setNameMsg("✓ Name updated");
      setTimeout(() => setNameMsg(""), 3000);
    } else {
      setNameMsg(`⚠ ${data?.error || "Update failed"}`);
    }
  };

  const changePw = async () => {
    setPwMsg(""); setPwErr("");
    if (!curPw || !newPw || !confPw) { setPwErr("All fields required"); return; }
    if (newPw !== confPw)            { setPwErr("New passwords do not match"); return; }
    if (newPw.length < 8)            { setPwErr("New password must be at least 8 characters"); return; }
    setSavingPw(true);
    const data = await apiCall("POST", "/api/auth/password", { current_password: curPw, new_password: newPw });
    setSavingPw(false);
    if (data?.ok) {
      setPwMsg("✓ Password updated successfully");
      setCurPw(""); setNewPw(""); setConfPw("");
      setTimeout(() => setPwMsg(""), 4000);
    } else {
      setPwErr(data?.error || "Could not update password");
    }
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Account settings</h1>
        <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Profile & security</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:16 }}>
        {/* Profile card */}
        <div style={sCard}>
          <h3 style={{ margin:"0 0 14px",fontSize:14,fontFamily:"'Syne',sans-serif" }}>Profile</h3>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Email</label>
            <input value={profile?.email || ""} disabled style={{ ...sInp, opacity:.5 }} />
            <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>Email cannot be changed</div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Display name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={sInp} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Role</label>
            <input value={profile?.role || "—"} disabled style={{ ...sInp, opacity:.5 }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Member since</label>
            <input value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
              disabled style={{ ...sInp, opacity:.5 }} />
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <Btn onClick={saveName} disabled={savingName || !name.trim() || name.trim() === profile?.name}
              style={{ padding:"8px 18px",fontSize:13 }}>
              {savingName ? "Saving…" : "Save profile"}
            </Btn>
            {nameMsg && <span style={{ fontSize:12, color: nameMsg.startsWith("✓") ? C.green : C.red }}>{nameMsg}</span>}
          </div>
        </div>

        {/* Change password card */}
        <div style={sCard}>
          <h3 style={{ margin:"0 0 14px",fontSize:14,fontFamily:"'Syne',sans-serif" }}>Change password</h3>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Current password</label>
            <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} style={sInp} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>New password</label>
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={sInp} />
            <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>At least 8 characters</div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={sLbl}>Confirm new password</label>
            <input type="password" value={confPw} onChange={e=>setConfPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&changePw()} style={sInp} />
          </div>
          {pwErr && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.red }}>{pwErr}</div>}
          {pwMsg && <div style={{ background:"rgba(0,201,122,.08)",border:"1px solid rgba(0,201,122,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.green }}>{pwMsg}</div>}
          <Btn onClick={changePw} disabled={savingPw} style={{ padding:"8px 18px",fontSize:13 }}>
            {savingPw ? "Updating…" : "Update password"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ORDER FORM — segment-aware reusable form used by Single & Multi tabs
//  Returns a payload via onChange(payload | null)
// ═══════════════════════════════════════════════════════════════════════
const PRODUCT_BY_SEGMENT = {
  NSE_EQ:       ["CNC", "INTRADAY", "MTF", "MARGIN"],
  BSE_EQ:       ["CNC", "INTRADAY", "MTF", "MARGIN"],
  NSE_FNO:      ["INTRADAY", "MARGIN"],
  BSE_FNO:      ["INTRADAY", "MARGIN"],
  NSE_CURRENCY: ["INTRADAY", "MARGIN"],
  BSE_CURRENCY: ["INTRADAY", "MARGIN"],
  MCX_COMM:     ["INTRADAY", "MARGIN"],
};

function OrderForm({ value, onChange, idx = 0, onRemove = null }) {
  const [exchange, setExchange]   = useState(value?.exchange || "NSE_EQ");
  const [side, setSide]           = useState(value?.side || "BUY");
  const [orderType, setOrderType] = useState(value?.order_type || "LIMIT");
  const [product, setProduct]     = useState(value?.product || "CNC");
  const [script, setScript]       = useState(value?.script || null); // {id, name, isin, lot}
  const [lots, setLots]           = useState(value?.lots || 1);
  const [qty, setQty]             = useState(value?.qty || 1);
  const [price, setPrice]         = useState(value?.price || "");

  const isFNO   = exchange === "NSE_FNO" || exchange === "BSE_FNO";
  const isComm  = exchange === "MCX_COMM";
  const isCurr  = exchange === "NSE_CURRENCY" || exchange === "BSE_CURRENCY";
  const useLots = isFNO || isComm || isCurr;
  const lotSize = script?.lot && script.lot > 0 ? script.lot : 1;
  const totalQty = useLots ? Math.max(1, parseInt(lots) || 1) * lotSize : Math.max(1, parseInt(qty) || 1);

  // Reset product when exchange changes
  useEffect(() => {
    const allowed = PRODUCT_BY_SEGMENT[exchange] || ["CNC"];
    if (!allowed.includes(product)) setProduct(allowed[0]);
  }, [exchange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push payload up whenever anything changes
  useEffect(() => {
    if (!script) { onChange(null); return; }
    const payload = {
      exchange,
      security_id: script.id,
      ticker:      script.name,
      isin:        script.isin || "",
      side, order_type: orderType, product,
      qty: totalQty,
      price: orderType === "LIMIT" ? parseFloat(price) || 0 : 0,
      // metadata for UI
      script, lots: useLots ? lots : null, lotSize,
    };
    onChange(payload);
  }, [exchange, script, side, orderType, product, lots, qty, price, totalQty, useLots]); // eslint-disable-line

  return (
    <div style={{ ...sCard, padding:18, position:"relative" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <div style={{ fontSize:13,fontWeight:600,color:C.text }}>Order #{idx + 1}</div>
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={()=>setSide("BUY")}
            style={{ padding:"5px 14px",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
              background: side==="BUY" ? C.green : "rgba(0,201,122,.08)",
              color:      side==="BUY" ? "#fff" : C.green,
              border:`1px solid ${side==="BUY" ? C.green : "rgba(0,201,122,.25)"}` }}>BUY</button>
          <button onClick={()=>setSide("SELL")}
            style={{ padding:"5px 14px",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
              background: side==="SELL" ? C.red : "rgba(255,69,96,.08)",
              color:      side==="SELL" ? "#fff" : C.red,
              border:`1px solid ${side==="SELL" ? C.red : "rgba(255,69,96,.25)"}` }}>SELL</button>
          <button onClick={()=>setOrderType("MARKET")}
            style={{ padding:"5px 14px",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
              background: orderType==="MARKET" ? C.blue : "rgba(66,133,255,.08)",
              color:      orderType==="MARKET" ? "#fff" : C.blue,
              border:`1px solid ${orderType==="MARKET" ? C.blue : "rgba(66,133,255,.25)"}` }}>MARKET</button>
          <button onClick={()=>setOrderType("LIMIT")}
            style={{ padding:"5px 14px",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
              background: orderType==="LIMIT" ? C.amber : "rgba(245,166,35,.08)",
              color:      orderType==="LIMIT" ? "#fff" : C.amber,
              border:`1px solid ${orderType==="LIMIT" ? C.amber : "rgba(245,166,35,.25)"}` }}>LIMIT</button>
          {onRemove && (
            <button onClick={onRemove} title="Remove this order"
              style={{ padding:"5px 10px",borderRadius:6,fontSize:14,cursor:"pointer",
                background:"rgba(255,255,255,.04)",color:C.muted,border:`1px solid ${C.hint}`,fontFamily:"inherit" }}>×</button>
          )}
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:12 }}>
        <div>
          <label style={sLbl}>Segment</label>
          <select value={exchange} onChange={e=>{ setExchange(e.target.value); setScript(null); }} style={sInp}>
            <option value="NSE_EQ">NSE Equity</option>
            <option value="BSE_EQ">BSE Equity</option>
            <option value="NSE_FNO">NSE F&O</option>
            <option value="BSE_FNO">BSE F&O</option>
            <option value="NSE_CURRENCY">NSE Currency</option>
            <option value="BSE_CURRENCY">BSE Currency</option>
            <option value="MCX_COMM">MCX Commodity</option>
          </select>
        </div>

        <div style={{ gridColumn:"span 2",minWidth:240 }}>
          <label style={sLbl}>Symbol</label>
          <ScriptSearch exchange={exchange} value={script} onChange={setScript} />
        </div>

        <div>
          <label style={sLbl}>Product</label>
          <select value={product} onChange={e=>setProduct(e.target.value)} style={sInp}>
            {(PRODUCT_BY_SEGMENT[exchange] || ["CNC"]).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {useLots ? (
          <div>
            <label style={sLbl}>Quantity (lots)</label>
            <input type="number" min={1} value={lots} onChange={e=>setLots(e.target.value)} style={sInp} />
            <div style={{ fontSize:10,color:C.muted,marginTop:3 }}>
              Lot size: {lotSize.toLocaleString("en-IN")} · Total qty: <span style={{color:C.text,fontWeight:600}}>{totalQty.toLocaleString("en-IN")}</span>
            </div>
          </div>
        ) : (
          <div>
            <label style={sLbl}>Quantity (shares)</label>
            <input type="number" min={1} value={qty} onChange={e=>setQty(e.target.value)} style={sInp} />
          </div>
        )}

        {orderType === "LIMIT" && (
          <div>
            <label style={sLbl}>Limit price (₹)</label>
            <input type="number" step="0.05" min={0} value={price} onChange={e=>setPrice(e.target.value)} style={sInp} placeholder="0.00" />
          </div>
        )}
      </div>

      {script && (
        <div style={{ marginTop:12,padding:"8px 12px",background:"rgba(66,133,255,.05)",border:"1px solid rgba(66,133,255,.12)",borderRadius:7,fontSize:11,color:C.muted,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
          <span>SecID: <span style={{color:C.text,fontFamily:"'DM Mono',monospace"}}>{script.id}</span></span>
          {script.isin && <span>ISIN: <span style={{color:C.text,fontFamily:"'DM Mono',monospace"}}>{script.isin}</span></span>}
          <span style={{color:side==="BUY"?C.green:C.red,fontWeight:600}}>
            {side} {totalQty.toLocaleString("en-IN")} {script.name} @ {orderType === "MARKET" ? "MARKET" : `₹${price || "—"}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CLIENT BUCKETS TAB
// ═══════════════════════════════════════════════════════════════════════
function BucketsTab({ clients }) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [memberIds, setMemberIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiCall("GET", "/api/buckets").then(data => {
      if (data?.ok) setBuckets(data.buckets || []);
      setLoading(false);
    });
  }, []);
  useEffect(load, [load]);

  const open = (b = null) => {
    setEdit(b);
    setName(b?.name || "");
    setDesc(b?.description || "");
    setMemberIds(new Set(b?.client_ids || []));
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    const body = { name: name.trim(), description: desc, client_ids: Array.from(memberIds) };
    const data = edit
      ? await apiCall("PUT", `/api/buckets/${edit.id}`, body)
      : await apiCall("POST", "/api/buckets", body);
    setSaving(false);
    if (data?.ok) { setShowForm(false); load(); }
    else setError(data?.error || "Save failed");
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete bucket "${b.name}"? Members are not deleted.`)) return;
    await apiCall("DELETE", `/api/buckets/${b.id}`);
    load();
  };

  const toggleMember = (id) => {
    setMemberIds(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Client buckets</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Group clients to send multi-orders in one click</p>
        </div>
        <Btn onClick={()=>open(null)}>+ New bucket</Btn>
      </div>

      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.muted }}>Loading…</div>}
      {!loading && buckets.length === 0 && (
        <div style={{ ...sCard,textAlign:"center",padding:"52px" }}>
          <div style={{ fontSize:34,marginBottom:12,opacity:.25 }}>⊞</div>
          <div style={{ fontSize:15,fontWeight:600,marginBottom:8 }}>No buckets yet</div>
          <div style={{ fontSize:13,color:C.muted,marginBottom:20 }}>Create groups like "All MTF clients" or "High value" to streamline multi-order placement.</div>
          <Btn onClick={()=>open(null)}>+ New bucket</Btn>
        </div>
      )}
      {!loading && buckets.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
          {buckets.map(b => (
            <div key={b.id} style={sCard}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:600,fontSize:15 }}>{b.name}</div>
                  {b.description && <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{b.description}</div>}
                </div>
                <span style={sBadge(C.blue)}>{b.member_count}</span>
              </div>
              <div style={{ fontSize:11,color:C.muted,marginBottom:14 }}>
                {b.member_count} client{b.member_count===1?"":"s"} · created {new Date(b.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <Btn variant="ghost" onClick={()=>open(b)} style={{ flex:1,padding:"6px 0",fontSize:12 }}>Edit</Btn>
                <Btn variant="danger" onClick={()=>remove(b)} style={{ flex:1,padding:"6px 0",fontSize:12 }}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={()=>setShowForm(false)} width={620}>
        <h2 style={{ margin:"0 0 16px",fontSize:18,fontFamily:"'Syne',sans-serif" }}>
          {edit ? "Edit bucket" : "New bucket"}
        </h2>
        <div style={{ marginBottom:14 }}>
          <label style={sLbl}>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. All MTF clients" style={sInp} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={sLbl}>Description (optional)</label>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. Margin trading clients only" style={sInp} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={sLbl}>Members ({memberIds.size} selected)</label>
          <div style={{ maxHeight:240,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8,padding:6 }}>
            {clients.length === 0 && <div style={{ padding:"14px",textAlign:"center",color:C.muted,fontSize:12 }}>No clients available.</div>}
            {clients.map(c => (
              <label key={c.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 8px",borderRadius:6,cursor:"pointer",
                background: memberIds.has(c.id) ? "rgba(66,133,255,.08)" : "transparent" }}>
                <input type="checkbox" checked={memberIds.has(c.id)} onChange={()=>toggleMember(c.id)} />
                <span style={{ fontSize:13,fontWeight:600 }}>{c.name}</span>
                <span style={{ fontSize:11,color:C.muted,marginLeft:"auto" }}>{c.broker}{c.active?"":" · INACTIVE"}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.red }}>{error}</div>}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : (edit ? "Save changes" : "Create bucket")}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SINGLE ORDER TAB
// ═══════════════════════════════════════════════════════════════════════
function SingleOrderTab({ clients }) {
  const [selClient, setSelClient] = useState("");
  const [payload, setPayload] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (!selClient && clients.length) setSelClient(clients[0].id); }, [clients, selClient]);

  const place = async () => {
    if (!selClient || !payload) return;
    if (!window.confirm(`Place ${payload.side} ${payload.qty} ${payload.ticker} at ${payload.order_type === "MARKET" ? "MARKET" : "₹" + payload.price}?`)) return;
    setPlacing(true); setResult(null);
    const data = await apiCall("POST", "/api/trade/single", { client_id: selClient, payload });
    setPlacing(false);
    setResult(data);
  };

  const canPlace = selClient && payload && (payload.order_type === "MARKET" || payload.price > 0);

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Single order</h1>
        <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Place a one-off order for a single client</p>
      </div>

      <div style={{ ...sCard, marginBottom:16 }}>
        <label style={sLbl}>Client</label>
        <select value={selClient} onChange={e=>setSelClient(e.target.value)} style={sInp}>
          {clients.length === 0 && <option value="">No clients available</option>}
          {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.broker} · {c.credentials?.client_id}</option>)}
        </select>
      </div>

      <OrderForm value={null} onChange={setPayload} idx={0} />

      <div style={{ marginTop:18,display:"flex",justifyContent:"flex-end",gap:10 }}>
        <Btn onClick={place} disabled={!canPlace || placing}
          variant={payload?.side === "SELL" ? "danger" : "primary"}
          style={{ padding:"10px 26px",fontSize:14 }}>
          {placing ? "Placing…" : payload ? `Place ${payload.side}` : "Place order"}
        </Btn>
      </div>

      {result && (
        <div style={{ ...sCard, marginTop:18,
          borderColor: result.ok && result.result?.ok ? "rgba(0,201,122,.3)" : "rgba(255,69,96,.3)",
          background: result.ok && result.result?.ok ? "rgba(0,201,122,.05)" : "rgba(255,69,96,.05)" }}>
          {result.ok && result.result?.ok ? (
            <>
              <div style={{ fontSize:14,fontWeight:600,color:C.green,marginBottom:6 }}>✓ Order placed successfully</div>
              <div style={{ fontSize:12,color:C.muted }}>
                Broker order ID: <span style={{ fontFamily:"'DM Mono',monospace",color:C.text }}>{result.result.order_id}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:14,fontWeight:600,color:C.red,marginBottom:6 }}>✗ Order failed</div>
              <div style={{ fontSize:12,color:C.muted }}>{result?.result?.error || result?.error || "Unknown error"}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MULTI ORDER TAB
// ═══════════════════════════════════════════════════════════════════════
function MultiOrderTab({ clients }) {
  const [orders, setOrders]   = useState([null]); // array of payloads
  const [target, setTarget]   = useState("clients"); // "clients" | "bucket"
  const [selClients, setSelClients] = useState(new Set());
  const [buckets, setBuckets] = useState([]);
  const [bucketId, setBucketId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    apiCall("GET", "/api/buckets").then(data => { if (data?.ok) setBuckets(data.buckets || []); });
  }, []);

  const setPayloadAt = (i, p) => setOrders(o => o.map((x, j) => j === i ? p : x));
  const addOrder    = () => setOrders(o => [...o, null]);
  const removeOrder = (i) => setOrders(o => o.length > 1 ? o.filter((_, j) => j !== i) : o);

  const toggleClient = (id) => {
    setSelClients(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const selectAll = () => setSelClients(new Set(clients.filter(c => c.active).map(c => c.id)));
  const clearAll  = () => setSelClients(new Set());

  const validOrders = orders.filter(o => o && o.security_id && (o.order_type === "MARKET" || o.price > 0));
  const targetCount = target === "bucket"
    ? (buckets.find(b => b.id === bucketId)?.member_count || 0)
    : selClients.size;
  const canPlace = validOrders.length > 0 && targetCount > 0 && !placing;

  const place = async () => {
    if (!canPlace) return;
    const summary = `${validOrders.length} order${validOrders.length===1?"":"s"} × ${targetCount} client${targetCount===1?"":"s"} = ${validOrders.length * targetCount} placements`;
    if (!window.confirm(`Place ${summary}?\n\nOrders will be sent sequentially. This is irreversible.`)) return;
    setPlacing(true); setResults(null);
    const body = { orders: validOrders };
    if (target === "bucket") body.bucket_id = bucketId;
    else body.client_ids = Array.from(selClients);
    const data = await apiCall("POST", "/api/trade/multi", body);
    setPlacing(false);
    setResults(data);
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Multi order</h1>
        <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Place one or more orders across multiple clients in one go</p>
      </div>

      {/* Orders */}
      <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:16 }}>
        {orders.map((_, i) => (
          <OrderForm key={i} idx={i} value={orders[i]}
            onChange={p => setPayloadAt(i, p)}
            onRemove={orders.length > 1 ? () => removeOrder(i) : null} />
        ))}
      </div>
      <div style={{ marginBottom:24 }}>
        <Btn variant="ghost" onClick={addOrder} style={{ padding:"6px 14px",fontSize:12 }}>+ Add order</Btn>
      </div>

      {/* Target client selector */}
      <div style={{ ...sCard, marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <h3 style={{ margin:0,fontSize:14,fontFamily:"'Syne',sans-serif" }}>Target clients</h3>
          <div style={{ display:"flex",gap:6 }}>
            <button onClick={()=>setTarget("clients")}
              style={{ padding:"5px 12px",borderRadius:6,fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit",
                background: target==="clients" ? "rgba(66,133,255,.18)" : "transparent",
                color:      target==="clients" ? C.blue : C.muted,
                border:`1px solid ${target==="clients" ? C.blue : C.hint}` }}>Pick clients</button>
            <button onClick={()=>setTarget("bucket")}
              style={{ padding:"5px 12px",borderRadius:6,fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit",
                background: target==="bucket" ? "rgba(66,133,255,.18)" : "transparent",
                color:      target==="bucket" ? C.blue : C.muted,
                border:`1px solid ${target==="bucket" ? C.blue : C.hint}` }}>Use bucket</button>
          </div>
        </div>

        {target === "clients" ? (
          <>
            <div style={{ display:"flex",gap:8,marginBottom:10 }}>
              <Btn variant="ghost" onClick={selectAll} style={{ padding:"4px 10px",fontSize:11 }}>Select all active</Btn>
              <Btn variant="ghost" onClick={clearAll}  style={{ padding:"4px 10px",fontSize:11 }}>Clear</Btn>
              <span style={{ marginLeft:"auto",fontSize:12,color:C.muted,alignSelf:"center" }}>{selClients.size} selected</span>
            </div>
            <div style={{ maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8,padding:6 }}>
              {clients.length === 0 && <div style={{ padding:"14px",textAlign:"center",color:C.muted,fontSize:12 }}>No clients available.</div>}
              {clients.map(c => (
                <label key={c.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:6,cursor: c.active ? "pointer" : "not-allowed",
                  opacity: c.active ? 1 : .4,
                  background: selClients.has(c.id) ? "rgba(66,133,255,.08)" : "transparent" }}>
                  <input type="checkbox" disabled={!c.active}
                    checked={selClients.has(c.id)} onChange={()=>toggleClient(c.id)} />
                  <span style={{ fontSize:13,fontWeight:600 }}>{c.name}</span>
                  <span style={{ fontSize:11,color:C.muted,marginLeft:"auto" }}>{c.broker}{c.active?"":" · INACTIVE"}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div>
            <select value={bucketId} onChange={e=>setBucketId(e.target.value)} style={sInp}>
              <option value="">— Select a bucket —</option>
              {buckets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.member_count})</option>)}
            </select>
            {bucketId && (
              <div style={{ marginTop:8,fontSize:12,color:C.muted }}>
                Will send to {buckets.find(b => b.id === bucketId)?.member_count || 0} client{(buckets.find(b => b.id === bucketId)?.member_count || 0)===1?"":"s"} in this bucket.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Place button + summary */}
      <div style={{ ...sCard, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:13,fontWeight:600,color:C.text }}>
            {validOrders.length} valid order{validOrders.length===1?"":"s"} × {targetCount} target{targetCount===1?"":"s"}
            {" "}= <span style={{color:C.blue}}>{validOrders.length * targetCount} placement{validOrders.length * targetCount===1?"":"s"}</span>
          </div>
          {orders.some(o => !o || !o.security_id) && (
            <div style={{ fontSize:11,color:C.amber,marginTop:3 }}>⚠ Some orders are incomplete and will be skipped</div>
          )}
        </div>
        <Btn onClick={place} disabled={!canPlace} style={{ padding:"10px 26px",fontSize:14 }}>
          {placing ? "Placing…" : "Place all orders"}
        </Btn>
      </div>

      {/* Results table */}
      {results && (
        <div style={sCard}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:14,fontFamily:"'Syne',sans-serif" }}>Results</h3>
            {results.summary && (
              <div style={{ display:"flex",gap:10,fontSize:12 }}>
                <span style={{color:C.green}}>✓ {results.summary.ok} succeeded</span>
                <span style={{color:C.red}}>✗ {results.summary.fail} failed</span>
                <span style={{color:C.muted}}>of {results.summary.total} total</span>
              </div>
            )}
          </div>
          {results.error && <div style={{ background:"rgba(255,69,96,.08)",border:"1px solid rgba(255,69,96,.2)",borderRadius:8,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.red }}>⚠ {results.error}</div>}
          {results.results && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",minWidth:640 }}>
                <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {["Order #","Client","Status","Order ID / Error"].map(h => (
                    <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {results.results.map((r, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}>
                      <td style={{ padding:"8px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>#{r.order_index + 1}</td>
                      <td style={{ padding:"8px 10px",fontWeight:600 }}>{r.client_name}</td>
                      <td style={{ padding:"8px 10px" }}>
                        <span style={sBadge(r.ok ? C.green : C.red)}>{r.ok ? "✓ OK" : "✗ FAIL"}</span>
                      </td>
                      <td style={{ padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:11,color: r.ok ? C.text : C.red }}>
                        {r.ok ? r.order_id : r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
const STATUS_COL = {RUNNING:C.green,PAUSED:C.amber,STOPPED:C.red,IDLE:"rgba(255,255,255,.4)"};
const NAV = [
  {id:"dashboard",  label:"Dashboard",   icon:"◈"},
  {id:"clients",    label:"Clients",     icon:"⊙"},
  {id:"buckets",    label:"Buckets",     icon:"⊞"},
  {id:"single",     label:"Single Order",icon:"→"},
  {id:"multi",      label:"Multi Order", icon:"⇉"},
  {id:"bots",       label:"Active bots", icon:"⊡"},
  {id:"holdings",   label:"Holdings",    icon:"▦"},
  {id:"positions",  label:"Positions",   icon:"◫"},
  {id:"limits",     label:"Limit window",icon:"◷"},
  {id:"orders",     label:"Orders",      icon:"≡"},
  {id:"demo",       label:"Demo trade",  icon:"▷"},
  {id:"logs",       label:"Logs",        icon:"☰"},
  {id:"account",    label:"Account",     icon:"⊚"},
];
// No hardcoded clients — all clients load from backend database

export default function App() {
  const [user, setUser]         = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab]         = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsPage, setClientsPage]       = useState(1);
  const [clientsLimit]                      = useState(50);
  const [clientsTotal, setClientsTotal]     = useState(0);
  const [clientsQuery, setClientsQuery]     = useState("");
  const [bots, setBots]       = useState([]);
  const [botsBusy, setBotsBusy] = useState({}); // botId -> "starting"|"stopping"
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddBot, setShowAddBot]       = useState(false);
  const [showKill, setShowKill]           = useState(false);
  const [editClient, setEditClient]       = useState(null);
  const [orderFilter, setOrderFilter]     = useState("ALL");
  const [tick, setTick]       = useState(0);
  const [istTime, setIstTime] = useState("");

  // Check if already logged in on load
  useEffect(()=>{
    const token = getToken();
    if (token) {
      apiCall("GET", "/api/auth/me").then(data => {
        if (data?.ok && data.user) setUser(data.user);
        else clearToken();
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load clients from backend when logged in (paginated + search, debounced on q)
  useEffect(()=>{
    if (!user) return;
    setClientsLoading(true);
    const t = setTimeout(() => {
      apiCall("GET", `/api/clients?page=${clientsPage}&limit=${clientsLimit}&q=${encodeURIComponent(clientsQuery)}`).then(data=>{
        if (data?.ok && Array.isArray(data.clients)) {
          setClients(data.clients);
          setClientsTotal(data.total || data.clients.length);
        }
        setClientsLoading(false);
      });
    }, clientsQuery ? 220 : 0);
    return () => clearTimeout(t);
  }, [user, clientsPage, clientsLimit, clientsQuery]);

  // Load bots from backend when logged in
  useEffect(()=>{
    if (!user) return;
    apiCall("GET", "/api/bots").then(data=>{
      if (data?.ok && Array.isArray(data.bots)) {
        setBots(data.bots.map(b=>({
          ...b,
          pnl:    parseFloat(b.realized_pnl || 0),
          client: b.client_name || "",
        })));
      }
    });
  }, [user]);

  // IST clock
  useEffect(()=>{
    const update=()=>setIstTime(new Date().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    update();
    const t=setInterval(update,1000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),5000); return()=>clearInterval(t); },[]);

  // Bots are loaded from backend; no client-side P&L simulation.
  // We refresh the bot list every 5s so status/PnL stay reasonably fresh.
  useEffect(()=>{
    if (!user) return;
    const t = setInterval(() => {
      apiCall("GET", "/api/bots").then(data=>{
        if (data?.ok && Array.isArray(data.bots)) {
          setBots(data.bots.map(b=>({
            ...b,
            pnl:    parseFloat(b.realized_pnl || 0),
            client: b.client_name || "",
          })));
        }
      });
    }, 5000);
    return () => clearInterval(t);
  }, [user]);

  const liveBots    = bots;
  const totalPnl    = liveBots.reduce((s,b)=>s+(b.pnl||0),0);
  const runningBots = liveBots.filter(b=>b.status==="RUNNING").length;

  // Save client to backend database
  const addClient = async (c) => {
    try {
      let data;
      if (c.id) {
        // Edit existing client
        data = await apiCall("PUT", `/api/clients/${c.id}`, c);
      } else {
        // Add new client
        data = await apiCall("POST", "/api/clients", c);
      }
      if (data?.ok && data.client) {
        setClients(prev=>[...prev.filter(x=>x.id!==data.client.id), data.client]);
      } else {
        // Fallback — add locally if backend fails
        setClients(prev=>[...prev.filter(x=>x.id!==c.id), c]);
      }
    } catch(e) {
      setClients(prev=>[...prev.filter(x=>x.id!==c.id), c]);
    }
  };

  const removeClient = async (id) => {
    await apiCall("DELETE", `/api/clients/${id}`);
    setClients(prev=>prev.filter(c=>c.id!==id));
  };

  const toggleClient = async (id) => {
    const client = clients.find(c=>c.id===id);
    if (!client) return;
    const updated = {...client, active: !client.active};
    await apiCall("PUT", `/api/clients/${id}`, updated);
    setClients(prev=>prev.map(c=>c.id===id?{...c,active:!c.active}:c));
  };

  // Add bot via backend (creates the row, returns the canonical record)
  const addBot = async (b) => {
    const data = await apiCall("POST", "/api/bots", b);
    if (data?.ok && data.bot) {
      setBots(prev => [...prev, { ...data.bot, pnl: 0, client: b.client || "" }]);
    } else {
      // Fallback: keep optimistic record so the user sees something
      setBots(prev => [...prev, b]);
    }
  };

  const startBot = async (id) => {
    setBotsBusy(b => ({ ...b, [id]: "starting" }));
    const data = await apiCall("POST", `/api/bots/${id}/start`);
    setBotsBusy(b => { const n = { ...b }; delete n[id]; return n; });
    if (data?.ok) {
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: "RUNNING" } : b));
    } else {
      alert(`Failed to start bot:\n\n${data?.message || data?.error || "Unknown error"}`);
    }
  };

  const stopBot = async (id) => {
    setBotsBusy(b => ({ ...b, [id]: "stopping" }));
    const data = await apiCall("POST", `/api/bots/${id}/stop`);
    setBotsBusy(b => { const n = { ...b }; delete n[id]; return n; });
    if (data?.ok) {
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: "STOPPED" } : b));
    } else {
      alert(`Failed to stop bot:\n\n${data?.message || data?.error || "Unknown error"}`);
    }
  };

  const killAllBots = async () => {
    const data = await apiCall("POST", "/api/bots/kill-all", {});
    if (data?.ok) {
      setBots(prev => prev.map(b => ({ ...b, status: "STOPPED" })));
      alert(`⚡ KILL SWITCH EXECUTED at IST ${istTime}\n${data.message || `${data.killed || 0} bot(s) stopped.`}`);
    } else {
      alert(`Kill switch failed:\n\n${data?.message || data?.error || "Unknown error"}`);
    }
  };

  const killBot = async (id) => {
    const data = await apiCall("POST", `/api/bots/${id}/kill`);
    if (data?.ok) {
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: "STOPPED" } : b));
    } else {
      alert(`Kill failed:\n\n${data?.message || data?.error || "Unknown error"}`);
    }
  };

  const navStyle = (active) => ({
    padding:"9px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:9,
    fontSize:13, transition:"all .15s",
    background:active?"rgba(66,133,255,.12)":"transparent",
    color:active?C.blue:C.muted,
    borderLeft:`2px solid ${active?C.blue:"transparent"}`,
  });

  // Auth guards — must be after all hooks
  if (!authChecked) return (
    <div style={{ minHeight:"100vh", background:"#0b0d14", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif" }}>
      <div>Loading GridBot...</div>
    </div>
  );
  if (!user) return <LoginScreen onLogin={setUser} />;

  const isMarketOpen = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));
    const h=ist.getHours(), m=ist.getMinutes(), wd=ist.getDay();
    if(wd===0||wd===6) return false;
    const mins=h*60+m;
    return mins>=555 && mins<=930; // 9:15 to 15:30
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{ display:"flex",minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',sans-serif",fontSize:13 }}>

        {/* Sidebar */}
        <div style={{ width:198,background:"#0e1018",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0 }}>
          <div style={{ padding:"18px 16px 14px",borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif",letterSpacing:"-.02em" }}>GridBot</div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2 }}>Multi-broker · NSE / BSE</div>
          </div>

          {/* IST clock */}
          <div style={{ padding:"8px 16px",borderBottom:`1px solid ${C.border}`,
            display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <span style={{ fontSize:10,color:C.muted }}>IST</span>
            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:C.text }}>{istTime}</span>
            <span style={{ ...sBadge(isMarketOpen()?C.green:C.red),fontSize:9 }}>
              {isMarketOpen()?"OPEN":"CLOSED"}
            </span>
          </div>

          <div style={{ paddingTop:8,flex:1 }}>
            {NAV.map(n=>(
              <div key={n.id} style={navStyle(tab===n.id)} onClick={()=>setTab(n.id)}>
                <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
              </div>
            ))}
          </div>

          {/* Kill switch */}
          <div style={{ padding:"12px 14px",borderTop:`1px solid ${C.border}` }}>
            <button onClick={()=>setShowKill(true)} style={{
              width:"100%",padding:"9px",borderRadius:8,
              background:"rgba(255,30,60,.15)",border:"1px solid rgba(255,30,60,.4)",
              color:"#ff1e3c",fontWeight:800,fontSize:13,cursor:"pointer",
              fontFamily:"inherit",letterSpacing:".03em",transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,30,60,.25)"; e.currentTarget.style.borderColor="rgba(255,30,60,.7)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,30,60,.15)"; e.currentTarget.style.borderColor="rgba(255,30,60,.4)"; }}>
              ⚡ KILL SWITCH
            </button>
          </div>

          {/* P&L */}
          <div style={{ padding:"0 14px 8px" }}>
            <button onClick={()=>{ clearToken(); setUser(null); }} style={{
              width:"100%", padding:"8px", borderRadius:8,
              background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
              color:"rgba(255,255,255,.4)", fontSize:12, cursor:"pointer", fontFamily:"inherit",
            }}>
              Logout ({user?.name})
            </button>
          </div>
          <div style={{ padding:"0 14px 16px" }}>
            <div style={{ background:"rgba(0,201,122,.06)",border:"1px solid rgba(0,201,122,.14)",
              borderRadius:9,padding:"10px 12px" }}>
              <div style={{ fontSize:10,color:"rgba(0,201,122,.6)",marginBottom:3 }}>Today's P&L</div>
              <div style={{ fontSize:16,fontFamily:"'DM Mono',monospace",fontWeight:700,
                color:totalPnl>=0?C.green:C.red }}>
                {totalPnl>=0?"+":""}₹{Math.abs(totalPnl).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,",")}
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1,padding:24,overflowY:"auto" }}>

          {/* DASHBOARD */}
          {tab==="dashboard" && (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
                <div>
                  <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Dashboard</h1>
                  <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>
                    {clients.length} client{clients.length!==1?"s":""} · All times IST (UTC+5:30)
                  </p>
                </div>
                <Btn onClick={()=>setShowAddBot(true)}>+ Add Grid Bot</Btn>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
                {[
                  {l:"Total P&L",    v:`${totalPnl>=0?"+":""}₹${Math.abs(totalPnl).toFixed(0)}`, c:totalPnl>=0?C.green:C.red},
                  {l:"Running bots", v:runningBots, c:C.blue},
                  {l:"Clients",      v:clients.filter(c=>c.active).length, c:C.text},
                  {l:"Total bots",   v:liveBots.length, c:C.text},
                ].map(({l,v,c})=>(
                  <div key={l} style={{ ...sCard,padding:"16px 18px" }}>
                    <div style={{ fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6 }}>{l}</div>
                    <div style={{ fontSize:24,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{v}</div>
                  </div>
                ))}
              </div>
              {liveBots.length===0
                ? <div style={{ ...sCard,textAlign:"center",padding:"52px 24px" }}>
                    <div style={{ fontSize:34,marginBottom:12,opacity:.25 }}>⊡</div>
                    <div style={{ fontSize:15,fontWeight:600,marginBottom:8 }}>No bots configured yet</div>
                    <div style={{ fontSize:13,color:C.muted,marginBottom:20 }}>Add a client first, then configure your first grid bot</div>
                    <Btn onClick={()=>setShowAddBot(true)}>+ Add Grid Bot</Btn>
                  </div>
                : <div style={sCard}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
                      <span style={{ fontWeight:600 }}>All bots</span>
                      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                        <span style={{ fontSize:11,color:C.muted }}>IST {istTime} · auto-refresh 5s</span>
                        <Btn variant="kill" style={{ padding:"5px 12px",fontSize:12 }} onClick={()=>setShowKill(true)}>⚡ Kill All</Btn>
                      </div>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
                        <thead>
                          <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                            {["Script","Sec ID","ISIN","Client","Broker","Product","Status","P&L","Kill"].map(h=>(
                              <th key={h} style={{ textAlign:"left",padding:"5px 8px",fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {liveBots.map(b=>(
                            <tr key={b.id} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              <td style={{ padding:"10px 8px",fontWeight:600 }}>{b.ticker}</td>
                              <td style={{ padding:"10px 8px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{b.security_id}</td>
                              <td style={{ padding:"10px 8px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:11 }}>{b.isin||"—"}</td>
                              <td style={{ padding:"10px 8px",color:C.muted }}>{b.client}</td>
                              <td style={{ padding:"10px 8px" }}><span style={sBadge(C.blue)}>{b.broker||"—"}</span></td>
                              <td style={{ padding:"10px 8px" }}><span style={sBadge(C.amber)}>{b.product}</span></td>
                              <td style={{ padding:"10px 8px" }}><span style={sBadge(STATUS_COL[b.status])}>{b.status}</span></td>
                              <td style={{ padding:"10px 8px",fontFamily:"'DM Mono',monospace",color:b.pnl>=0?C.green:C.red,fontWeight:500 }}>
                                {b.pnl>=0?"+":""}₹{Math.abs(b.pnl).toFixed(0)}
                              </td>
                              <td style={{ padding:"10px 8px" }}>
                                <button onClick={()=>killBot(b.id)} title="Kill this bot"
                                  style={{ background:"rgba(255,30,60,.12)",border:"1px solid rgba(255,30,60,.3)",
                                    borderRadius:6,color:"#ff1e3c",fontWeight:700,fontSize:12,
                                    padding:"3px 10px",cursor:"pointer" }}>⚡</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
              }
            </div>
          )}

          {/* CLIENTS */}
          {tab==="clients" && (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                <div>
                  <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Client management</h1>
                  <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>{BROKERS.length} brokers · TOTP auto-refresh 8:00 AM IST</p>
                </div>
                <Btn onClick={()=>{ setEditClient(null); setShowAddClient(true); }}>+ Add client</Btn>
              </div>
              <div style={{ background:"rgba(66,133,255,.05)",border:"1px solid rgba(66,133,255,.15)",
                borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:12,
                color:"rgba(180,200,255,.8)",lineHeight:1.7 }}>
                <strong style={{ color:C.blue }}>Auto token refresh at 8:00 AM IST</strong> — Provide TOTP secret for any broker.
                Backend generates 6-digit OTP automatically every morning, logs in and refreshes access token.
                No manual action from account holder. Works for Dhan, Zerodha, Angel One, Upstox, Fyers and all TOTP brokers.
              </div>

              {/* Search bar */}
              <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:14 }}>
                <input
                  value={clientsQuery}
                  onChange={e=>{ setClientsQuery(e.target.value); setClientsPage(1); }}
                  placeholder="Search by name or broker…"
                  style={{ ...sInp, maxWidth:340 }}
                />
                <span style={{ fontSize:12, color:C.muted }}>
                  {clientsLoading ? "Loading…" : `${clientsTotal} client${clientsTotal===1?"":"s"} total`}
                </span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
                {clientsLoading && (
                  <div style={{ ...sCard, textAlign:"center", padding:"40px", color:C.muted, gridColumn:"1/-1" }}>
                    Loading clients from database...
                  </div>
                )}
                {!clientsLoading && clients.length === 0 && (
                  <div style={{ ...sCard, textAlign:"center", padding:"40px", color:C.muted, gridColumn:"1/-1" }}>
                    No clients added yet. Click "+ Add client" to get started.
                  </div>
                )}
                {clients.map(c=>{
                  const fields=BROKER_FIELDS[c.broker]||[];
                  const hasTOTP=fields.some(f=>f.k==="totp_secret");
                  const totpSet=hasTOTP&&!!c.credentials?.totp_secret;
                  return (
                    <div key={c.id} style={{ ...sCard,transition:"border .15s" }}
                      onMouseEnter={e=>e.currentTarget.style.border="1px solid rgba(66,133,255,.25)"}
                      onMouseLeave={e=>e.currentTarget.style.border=`1px solid ${C.border}`}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={{ width:38,height:38,borderRadius:"50%",background:"rgba(66,133,255,.15)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:13,fontWeight:700,color:C.blue }}>
                            {c.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600,fontSize:15 }}>{c.name}</div>
                            <div style={{ fontSize:12,color:C.muted }}>{c.broker} · {c.credentials?.client_id}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end" }}>
                          <span style={sBadge(c.active?C.green:C.muted)}>{c.active?"ACTIVE":"INACTIVE"}</span>
                          {hasTOTP&&<span style={sBadge(totpSet?C.green:C.amber)}>{totpSet?"✓ TOTP":"⚠ NO TOTP"}</span>}
                        </div>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14 }}>
                        {[{l:"Bots",v:c.bots,c2:C.text},{l:"P&L",v:`${c.pnl>=0?"+":""}₹${c.pnl}`,c2:c.pnl>=0?C.green:C.red},{l:"Since",v:c.added,c2:C.muted}].map(({l,v,c2})=>(
                          <div key={l} style={{ background:"rgba(255,255,255,.03)",borderRadius:7,padding:"7px 10px" }}>
                            <div style={{ fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2 }}>{l}</div>
                            <div style={{ fontSize:12,fontWeight:500,color:c2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:11,color:totpSet?C.green:C.amber,marginBottom:12 }}>
                        {totpSet?"⏰ Auto token refresh: 8:00 AM IST daily":"⚠ Set TOTP secret to enable auto-refresh"}
                      </div>
                      <div style={{ display:"flex",gap:8 }}>
                        <Btn variant="ghost" onClick={()=>toggleClient(c.id)} style={{ flex:1,padding:"7px 0",fontSize:12 }}>
                          {c.active?"Deactivate":"Activate"}
                        </Btn>
                        <Btn variant="ghost" onClick={()=>{ setEditClient(c); setShowAddClient(true); }}
                          style={{ flex:1,padding:"7px 0",fontSize:12 }}>Edit</Btn>
                        {(
                          <Btn variant="danger" onClick={()=>removeClient(c.id)} style={{ flex:1,padding:"7px 0",fontSize:12 }}>Remove</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {clientsTotal > clientsLimit && (() => {
                const pages = Math.ceil(clientsTotal / clientsLimit);
                const goto = (p) => setClientsPage(Math.max(1, Math.min(pages, p)));
                return (
                  <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:10,marginTop:18,fontSize:12 }}>
                    <Btn variant="ghost" disabled={clientsPage<=1} onClick={()=>goto(clientsPage-1)}
                      style={{ padding:"5px 12px",fontSize:12,opacity:clientsPage<=1?.4:1 }}>← Prev</Btn>
                    <span style={{ color:C.muted }}>
                      Page <span style={{ color:C.text,fontWeight:600 }}>{clientsPage}</span> of {pages}
                      <span style={{ marginLeft:8,opacity:.6 }}>
                        ({((clientsPage-1)*clientsLimit)+1}–{Math.min(clientsPage*clientsLimit, clientsTotal)} of {clientsTotal})
                      </span>
                    </span>
                    <Btn variant="ghost" disabled={clientsPage>=pages} onClick={()=>goto(clientsPage+1)}
                      style={{ padding:"5px 12px",fontSize:12,opacity:clientsPage>=pages?.4:1 }}>Next →</Btn>
                  </div>
                );
              })()}
            </div>
          )}
          {tab==="bots" && (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                <div>
                  <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Active bots</h1>
                  <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>All grid bots · script data from NSE/BSE master</p>
                </div>
                <div style={{ display:"flex",gap:10 }}>
                  <Btn variant="kill" onClick={()=>setShowKill(true)} style={{ fontSize:12 }}>⚡ Kill switch</Btn>
                  <Btn onClick={()=>setShowAddBot(true)}>+ Add Grid Bot</Btn>
                </div>
              </div>
              {liveBots.length===0
                ? <div style={{ ...sCard,textAlign:"center",padding:"52px" }}>
                    <div style={{ fontSize:13,color:C.muted,marginBottom:16 }}>No bots configured yet.</div>
                    <Btn onClick={()=>setShowAddBot(true)}>+ Add Grid Bot</Btn>
                  </div>
                : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
                    {liveBots.map(b=>(
                      <div key={b.id} style={{ ...sCard,transition:"border .15s" }}
                        onMouseEnter={e=>e.currentTarget.style.border="1px solid rgba(66,133,255,.25)"}
                        onMouseLeave={e=>e.currentTarget.style.border=`1px solid ${C.border}`}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                          <div>
                            <div style={{ fontWeight:700,fontSize:15,fontFamily:"'Syne',sans-serif" }}>{b.ticker}</div>
                            <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{b.exchange} · {b.security_id}</div>
                            {b.isin&&<div style={{ fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"'DM Mono',monospace" }}>{b.isin}</div>}
                          </div>
                          <span style={sBadge(STATUS_COL[b.status])}>{b.status}</span>
                        </div>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10 }}>
                          {[
                            {l:"P&L",v:`${b.pnl>=0?"+":""}₹${Math.abs(b.pnl).toFixed(0)}`,c:b.pnl>=0?C.green:C.red},
                            {l:"Range",v:`₹${b.lower_limit}–₹${b.upper_limit}`,c:C.muted},
                            {l:"Step",v:`₹${b.grid_step}`,c:C.text},
                            {l:"Qty",v:b.trade_qty,c:C.text},
                          ].map(({l,v,c})=>(
                            <div key={l} style={{ background:"rgba(255,255,255,.04)",borderRadius:7,padding:"7px 8px" }}>
                              <div style={{ fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".05em",marginBottom:2 }}>{l}</div>
                              <div style={{ fontSize:12,fontWeight:600,color:c,fontFamily:"'DM Mono',monospace" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex",gap:8,alignItems:"center",justifyContent:"space-between" }}>
                          <div style={{ display:"flex",gap:6 }}>
                            <span style={sBadge(C.amber)}>{b.product}</span>
                            <span style={{ fontSize:11,color:C.muted }}>{b.client}</span>
                          </div>
                          <div style={{ display:"flex",gap:6 }}>
                            {b.status === "RUNNING" ? (
                              <Btn variant="ghost" disabled={!!botsBusy[b.id]}
                                onClick={()=>stopBot(b.id)}
                                style={{ padding:"3px 10px",fontSize:11 }}>
                                {botsBusy[b.id]==="stopping" ? "Stopping…" : "■ Stop"}
                              </Btn>
                            ) : (
                              <Btn variant="success" disabled={!!botsBusy[b.id]}
                                onClick={()=>startBot(b.id)}
                                style={{ padding:"3px 10px",fontSize:11 }}>
                                {botsBusy[b.id]==="starting" ? "Starting…" : "▶ Start"}
                              </Btn>
                            )}
                            <button onClick={()=>killBot(b.id)} title="Kill this bot"
                              style={{ background:"rgba(255,30,60,.12)",border:"1px solid rgba(255,30,60,.3)",
                                borderRadius:6,color:"#ff1e3c",fontWeight:700,fontSize:11,
                                padding:"3px 10px",cursor:"pointer" }}>⚡ Kill</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          {tab==="holdings"  && <HoldingsTab clients={clients}/>}
          {tab==="positions" && <PositionsTab clients={clients}/>}
          {tab==="limits"    && <LimitTab clients={clients}/>}
          {tab==="demo"      && <DemoTab/>}

          {tab==="buckets" && <BucketsTab clients={clients}/>}
          {tab==="single"  && <SingleOrderTab clients={clients}/>}
          {tab==="multi"   && <MultiOrderTab clients={clients}/>}
          {tab==="orders" && <OrdersTab clients={clients} filter={orderFilter} onFilterChange={setOrderFilter} />}
          {tab==="logs"    && <LogsTab/>}
          {tab==="account" && <AccountTab user={user} onUserUpdate={setUser}/>}
        </div>
      </div>

      {/* MODALS */}
      <Modal open={showAddBot} onClose={()=>setShowAddBot(false)} width={740}>
        <AddBotForm clients={clients} onAdd={addBot} onClose={()=>setShowAddBot(false)}/>
      </Modal>
      <Modal open={showAddClient} onClose={()=>{ setShowAddClient(false); setEditClient(null); }} width={660}>
        <AddClientForm editData={editClient} onAdd={addClient} onClose={()=>{ setShowAddClient(false); setEditClient(null); }}/>
      </Modal>
      <KillSwitchModal open={showKill} onClose={()=>setShowKill(false)} onKillAll={killAllBots} onKillBot={killBot} bots={liveBots}/>
    </>
  );
}
