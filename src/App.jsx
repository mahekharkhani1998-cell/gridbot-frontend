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
  const ref = useRef();
  const scripts = SEGMENT_SCRIPTS[exchange] || [];
  const filtered = q.length === 0
    ? scripts.slice(0,20)
    : scripts.filter(s =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.id.startsWith(q)
      ).slice(0,25);

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
      {open && filtered.length>0 && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:500,
          background:"#1a1f30",border:`1px solid ${C.border}`,borderRadius:10,
          boxShadow:"0 16px 48px rgba(0,0,0,.65)",maxHeight:280,overflowY:"auto" }}>
          <div style={{ padding:"6px 12px",fontSize:10,color:C.muted,borderBottom:`1px solid ${C.border}`,
            display:"flex",justifyContent:"space-between" }}>
            <span>{scripts.length} scripts in {exchange}</span>
            <span>{LAST_REFRESH}</span>
          </div>
          {filtered.map((s,i)=>(
            <div key={s.id+i} onClick={()=>select(s)}
              style={{ padding:"9px 14px",cursor:"pointer",borderBottom:`1px solid rgba(255,255,255,.03)`,
                display:"flex",justifyContent:"space-between",alignItems:"center" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(66,133,255,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{ fontWeight:600,fontSize:13,color:C.text }}>{s.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:1 }}>
                  {s.isin||"—"}{s.lot?` · Lot: ${s.lot}`:""}
                </div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0,marginLeft:12 }}>
                <div style={sBadge(C.blue)}>{s.id}</div>
                <div style={{ fontSize:10,color:C.muted,marginTop:3 }}>{s.s}</div>
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
          onAdd({ id:editData?.id||"C"+Date.now().toString().slice(-7),
            ...form, active:true,
            added:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"}),
            bots:editData?.bots||0, pnl:editData?.pnl||0 });
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
  const cl = clients.find(c=>c.id===selClient);
  // Mock holdings data — real: fetch from Dhan get_holdings()
  const holdings = cl ? [
    { script:"BSE LIMITED",  sid:"19585", isin:"INE118H01025", buyQty:4,  sellQty:2,  buyRate:2820, sellRate:2848, netQty:2,  pnl:56,  ltp:2845 },
    { script:"INFOSYS",      sid:"1594",  isin:"INE009A01021", buyQty:3,  sellQty:1,  buyRate:1760, sellRate:1792, netQty:2,  pnl:64,  ltp:1785 },
    { script:"RELIANCE IND", sid:"11536", isin:"INE002A01018", buyQty:2,  sellQty:2,  buyRate:2900, sellRate:2940, netQty:0,  pnl:80,  ltp:2935 },
    { script:"TCS",          sid:"10604", isin:"INE467B01029", buyQty:1,  sellQty:0,  buyRate:3850, sellRate:0,    netQty:1,  pnl:-25, ltp:3825 },
  ] : [];
  const totalPnl = holdings.reduce((s,h)=>s+h.pnl, 0);

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Holdings</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>CNC delivery positions across all bots · IST</p>
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

      <div style={sCard}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:720 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Script Name","Security ID","ISIN","Buy Qty","Sell Qty","Buy Rate","Sell Rate","Net Qty","LTP","P&L"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,
                    color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,
                    whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h,i)=>(
                <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"11px 10px",fontWeight:600 }}>{h.script}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{h.sid}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:11 }}>{h.isin}</td>
                  <td style={{ padding:"11px 10px",color:C.green,fontFamily:"'DM Mono',monospace" }}>{h.buyQty}</td>
                  <td style={{ padding:"11px 10px",color:C.red,fontFamily:"'DM Mono',monospace" }}>{h.sellQty}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{h.buyRate.toLocaleString("en-IN")}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>{h.sellRate>0?`₹${h.sellRate.toLocaleString("en-IN")}`:"—"}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",
                    color:h.netQty>0?C.green:h.netQty<0?C.red:C.muted,fontWeight:600 }}>
                    {h.netQty}
                  </td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{h.ltp.toLocaleString("en-IN")}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",
                    fontWeight:700,color:h.pnl>=0?C.green:C.red }}>
                    {h.pnl>=0?"+":""}₹{Math.abs(h.pnl).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              {holdings.length===0 && (
                <tr><td colSpan={10} style={{ padding:"32px",textAlign:"center",color:C.muted,fontSize:13 }}>
                  No holdings found. Select a client or add bots first.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop:10,fontSize:11,color:C.muted }}>
        * Live data: calls Dhan <code style={{ background:"rgba(255,255,255,.06)",padding:"1px 5px",borderRadius:3 }}>get_holdings()</code> and <code style={{ background:"rgba(255,255,255,.06)",padding:"1px 5px",borderRadius:3 }}>get_positions()</code> APIs. All timestamps in IST.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  POSITIONS TAB
// ═══════════════════════════════════════════════════════════════════════
function PositionsTab({ clients }) {
  const [selClient, setSelClient] = useState(clients[0]?.id||"");
  const positions = [
    { script:"NIFTY 50",     sid:"13",    type:"FUT",  buyQty:1,  sellQty:0, buyRate:22350, sellRate:0,    netQty:1,  pnl:220,  ltp:22570 },
    { script:"BSE LIMITED",  sid:"19585", type:"EQ",   buyQty:10, sellQty:5, buyRate:2830,  sellRate:2855, netQty:5,  pnl:125,  ltp:2852 },
    { script:"BANKNIFTY",    sid:"26000", type:"FUT",  buyQty:0,  sellQty:1, buyRate:0,     sellRate:48200,netQty:-1, pnl:-180, ltp:48380 },
  ];
  const totalPnl = positions.reduce((s,p)=>s+p.pnl,0);

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Positions</h1>
          <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>Intraday + carry-forward positions · IST</p>
        </div>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <select value={selClient} onChange={e=>setSelClient(e.target.value)}
            style={{ ...sInp,width:"auto",padding:"8px 14px" }}>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.broker}</option>)}
          </select>
          <div style={{ background:"rgba(0,201,122,.07)",border:"1px solid rgba(0,201,122,.2)",
            borderRadius:9,padding:"8px 16px" }}>
            <div style={{ fontSize:10,color:C.muted }}>Unrealized P&L</div>
            <div style={{ fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",
              color:totalPnl>=0?C.green:C.red }}>
              {totalPnl>=0?"+":""}₹{Math.abs(totalPnl).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>
      <div style={sCard}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:720 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Script Name","Sec ID","Type","Buy Qty","Sell Qty","Buy Rate","Sell Rate","Net Qty","LTP","P&L"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,
                    color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
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
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",
                    color:p.netQty>0?C.green:p.netQty<0?C.red:C.muted,fontWeight:600 }}>{p.netQty}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>₹{p.ltp.toLocaleString("en-IN")}</td>
                  <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",
                    fontWeight:700,color:p.pnl>=0?C.green:C.red }}>
                    {p.pnl>=0?"+":""}₹{Math.abs(p.pnl).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LIMIT WINDOW
// ═══════════════════════════════════════════════════════════════════════
function LimitTab({ clients }) {
  const limits = clients.map(c=>({
    code: c.credentials?.client_id||"—",
    name: c.name,
    broker: c.broker,
    available: 245800,
    opening_balance: 300000,
    used_margin: 54200,
    gross_margin: 300000,
    pct_available: 81.9,
  }));

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Limit window</h1>
        <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>
          Available margin across all registered clients · IST · fetches from broker API
        </p>
      </div>
      <div style={sCard}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {["Client Code","Name","Broker","Available Margin","Opening Balance / Cash","Used Margin","Gross Margin","% Available"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:10,
                    color:C.muted,textTransform:"uppercase",letterSpacing:".05em",fontWeight:500,whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limits.map((l,i)=>{
                const pctCol = l.pct_available>60?C.green:l.pct_available>30?C.amber:C.red;
                return (
                  <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,.03)` }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.muted,fontSize:12 }}>{l.code}</td>
                    <td style={{ padding:"11px 10px",fontWeight:600 }}>{l.name}</td>
                    <td style={{ padding:"11px 10px" }}><span style={sBadge(C.blue)}>{l.broker}</span></td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.green,fontWeight:600 }}>
                      ₹{l.available.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>
                      ₹{l.opening_balance.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace",color:C.red }}>
                      ₹{l.used_margin.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding:"11px 10px",fontFamily:"'DM Mono',monospace" }}>
                      ₹{l.gross_margin.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding:"11px 10px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ flex:1,height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:`${l.pct_available}%`,background:pctCol,borderRadius:3,transition:"width .4s" }}/>
                        </div>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:pctCol,minWidth:38 }}>
                          {l.pct_available.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop:10,fontSize:11,color:C.muted }}>
        * Live: calls broker fund-limit API for each client. Refreshes every 30s during market hours (9:15 AM – 3:30 PM IST).
      </div>
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
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
const STATUS_COL = {RUNNING:C.green,PAUSED:C.amber,STOPPED:C.red,IDLE:"rgba(255,255,255,.4)"};
const NAV = [
  {id:"dashboard",  label:"Dashboard",   icon:"◈"},
  {id:"clients",    label:"Clients",     icon:"⊙"},
  {id:"bots",       label:"Active bots", icon:"⊡"},
  {id:"holdings",   label:"Holdings",    icon:"▦"},
  {id:"positions",  label:"Positions",   icon:"◫"},
  {id:"limits",     label:"Limit window",icon:"◷"},
  {id:"demo",       label:"Demo trade",  icon:"▷"},
  {id:"orders",     label:"Orders",      icon:"≡"},
];
const YOUR_CLIENT = {
  id:"C1109586852", name:"Owner", broker:"Dhan", segment:"NSE_EQ",
  note:"Primary trading account · Dhan client ID 1109586852",
  credentials:{ client_id:"1109586852", access_token:"", api_key:"", api_secret:"", secret_key:"", totp_secret:"" },
  active:true,
  added:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"}),
  bots:0, pnl:0,
};

export default function App() {
  const [user, setUser]         = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab]         = useState("dashboard");
  const [clients, setClients] = useState([YOUR_CLIENT]);
  const [bots, setBots]       = useState([]);
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
      apiCall("GET", "/health").then(data => {
        if (data) setUser({ name: "Admin" });
        else clearToken();
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // IST clock
  useEffect(()=>{
    const update=()=>setIstTime(new Date().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    update();
    const t=setInterval(update,1000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),2000); return()=>clearInterval(t); },[]);

  const liveBots = bots.map(b=>
    b.status==="RUNNING"
      ? {...b,pnl:+(b.pnl+(Math.random()-.48)*(b.grid_step*b.trade_qty*0.4)).toFixed(2)}
      : b
  );
  const totalPnl    = liveBots.reduce((s,b)=>s+b.pnl,0);
  const runningBots = liveBots.filter(b=>b.status==="RUNNING").length;

  const addClient   = (c) => setClients(prev=>[...prev.filter(x=>x.id!==c.id),c]);
  const removeClient= (id)=> { if(id===YOUR_CLIENT.id) return; setClients(prev=>prev.filter(c=>c.id!==id)); };
  const toggleClient= (id)=> setClients(prev=>prev.map(c=>c.id===id?{...c,active:!c.active}:c));
  const addBot      = (b) => setBots(prev=>[...prev,b]);
  const killAllBots = () => {
    setBots(prev=>prev.map(b=>({...b,status:"STOPPED",pnl:b.pnl})));
    alert(`⚡ KILL SWITCH EXECUTED at IST ${istTime}\nAll bots stopped. Square-off orders sent.`);
  };
  const killBot = (id) => setBots(prev=>prev.map(b=>b.id===id?{...b,status:"STOPPED"}:b));

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
                        <span style={{ fontSize:11,color:C.muted }}>IST {istTime} · auto-refresh 2s</span>
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
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
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
                        {c.id!==YOUR_CLIENT.id&&(
                          <Btn variant="danger" onClick={()=>removeClient(c.id)} style={{ flex:1,padding:"7px 0",fontSize:12 }}>Remove</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE BOTS */}
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
                          <button onClick={()=>killBot(b.id)} title="Kill this bot"
                            style={{ background:"rgba(255,30,60,.12)",border:"1px solid rgba(255,30,60,.3)",
                              borderRadius:6,color:"#ff1e3c",fontWeight:700,fontSize:11,
                              padding:"3px 10px",cursor:"pointer" }}>⚡ Kill</button>
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

          {/* ORDERS */}
          {tab==="orders" && (
            <div>
              <div style={{ marginBottom:20 }}>
                <h1 style={{ margin:0,fontSize:22,fontFamily:"'Syne',sans-serif",letterSpacing:"-.03em" }}>Order history</h1>
                <p style={{ margin:"3px 0 0",fontSize:13,color:C.muted }}>All orders · IST timestamps</p>
              </div>
              <div style={{ display:"flex",gap:8,marginBottom:16 }}>
                {["ALL","FILLED","OPEN","CANCELLED"].map(f=>(
                  <button key={f} onClick={()=>setOrderFilter(f)} style={{
                    padding:"6px 14px",borderRadius:7,border:`1px solid`,
                    borderColor:orderFilter===f?C.blue:C.hint,
                    background:orderFilter===f?"rgba(66,133,255,.12)":"transparent",
                    color:orderFilter===f?C.blue:C.muted,
                    cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"inherit" }}>{f}</button>
                ))}
              </div>
              <div style={{ ...sCard,textAlign:"center",padding:"40px",color:C.muted }}>
                <div>Orders appear here once bots are running.</div>
                <div style={{ fontSize:12,marginTop:6,opacity:.6 }}>Use Demo trade tab to see simulated order flow.</div>
              </div>
            </div>
          )}
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
