import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingCart, Heart, User, LogOut, LayoutDashboard, Settings, ShoppingBag, 
  Minus, Plus, Trash2, Edit2, Search, Bell, HelpCircle, Check, X, ShieldAlert, 
  Award, FileText, ChevronRight, ChevronDown, ChevronUp, Menu, ArrowLeft, Send, Sparkles, Mail, 
  BarChart2, AlertCircle, Percent, Phone, Lock, Eye, MessageSquare, Clock,
  Truck, ShieldCheck, RotateCcw, Headphones, Home, Star, Tag, Download, Share2, Printer, Camera, Upload
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const API_BASE = "/api";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existingScript = document.getElementById('google-identity-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const NobaraaLogo = ({ size = 60, color = "#7a4ea5" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="1" />
    <path 
      d="M38 32 C38 32 30 48 34 58 C38 68 44 68 44 58 C44 48 54 38 62 48 C70 58 64 68 64 68 M34 50 C44 50 48 40 56 34 C64 28 68 38 62 48 C56 58 50 68 44 68 C38 68 34 58 38 48 C42 38 50 32 58 32"
      stroke={color} 
      strokeWidth="4.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path d="M78 22 C80 20 84 22 84 25 C84 28 80 30 78 28 Z" fill={color} />
    <path d="M84 25 C86 23 90 25 90 28 C90 31 86 33 84 31 Z" fill={color} />
    <circle cx="80" cy="26" r="2" fill="#d0bdf4" />
    <path d="M70 20 C73 17 76 18 78 22" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M76 28 C80 32 82 36 80 40" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M80 40 C82 38 84 38 85 40" fill={color} />
    <path d="M22 78 C20 80 16 78 16 75 C16 72 20 70 22 72 Z" fill={color} />
    <path d="M16 75 C14 77 10 75 10 72 C10 69 14 67 16 69 Z" fill={color} />
    <circle cx="20" cy="74" r="2" fill="#d0bdf4" />
    <path d="M30 80 C27 83 24 82 22 78" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 72 C20 68 18 64 20 60" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M20 60 C18 62 16 62 15 60" fill={color} />
  </svg>
);

const getCategoryIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('cotton') || lower.includes('chiffon') || lower.includes('apparel') || lower.includes('clothing')) {
    return <Sparkles size={20} style={{ color: '#7a4ea5' }} />;
  }
  if (lower.includes('silk') || lower.includes('tissue') || lower.includes('banarasi')) {
    return <Award size={20} style={{ color: '#7a4ea5' }} />;
  }
  if (lower.includes('handbag') || lower.includes('bag')) {
    return <ShoppingBag size={20} style={{ color: '#7a4ea5' }} />;
  }
  if (lower.includes('footwear') || lower.includes('shoe')) {
    return <ShoppingBag size={20} style={{ color: '#7a4ea5' }} />;
  }
  return <Award size={20} style={{ color: '#7a4ea5' }} />;
};

const getDisplayOrderNumber = (o) => {
  if (!o) return '';
  if (o.online_order_number) {
    return `#${String(o.online_order_number).padStart(6, '0')}`;
  }
  if (o.tracking_info && !o.tracking_info.startsWith('DTDC') && !o.tracking_info.includes('AWB')) {
    return o.tracking_info;
  }
  return `#${o.id}`;
};

const getDisplayCustomizationNumber = (c) => {
  if (!c) return '';
  return `#CUST-${String(c.id).padStart(6, '0')}`;
};

const renderCollectionTitle = (name) => {
  const parts = name.split('&');
  if (parts.length > 1) {
    return (
      <h2 style={{ 
        fontFamily: "'Playfair Display', serif", 
        fontSize: '2.5rem', 
        fontWeight: 700, 
        color: '#2b0b57', 
        textAlign: 'center', 
        margin: '0 auto 10px',
        lineHeight: 1.2
      }}>
        {parts[0]} & <span style={{ fontFamily: "'Great Vibes', cursive", color: '#7a4ea5', fontSize: '3.2rem', display: 'inline-block', transform: 'translateY(5px)', textTransform: 'none' }}>{parts.slice(1).join('&')}</span>
      </h2>
    );
  }
  
  const words = name.split(' ');
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    const rest = words.slice(0, -1).join(' ');
    return (
      <h2 style={{ 
        fontFamily: "'Playfair Display', serif", 
        fontSize: '2.5rem', 
        fontWeight: 700, 
        color: '#2b0b57', 
        textAlign: 'center', 
        margin: '0 auto 10px',
        lineHeight: 1.2
      }}>
        {rest} <span style={{ fontFamily: "'Great Vibes', cursive", color: '#7a4ea5', fontSize: '3.2rem', display: 'inline-block', transform: 'translateY(5px)', textTransform: 'none' }}>{lastWord}</span>
      </h2>
    );
  }
  
  return (
    <h2 style={{ 
      fontFamily: "'Playfair Display', serif", 
      fontSize: '2.5rem', 
      fontWeight: 700, 
      color: '#2b0b57', 
      textAlign: 'center', 
      margin: '0 auto 10px',
      lineHeight: 1.2
    }}>
      {name}
    </h2>
  );
};


function NobaraaHero({ sareeModels = [] }) {
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const [activeModel, setActiveModel] = React.useState(0);

  const defaultSareeModels = [
    {
      id: 1,
      image: "/nobaraa_saree_model_1.png?v=2",
      name: "Royal Purple Saree",
      description: "Intricate gold zari borders woven on rich premium silk."
    },
    {
      id: 2,
      image: "/nobaraa_saree_model_2.png?v=2",
      name: "Cream & Gold Banarasi",
      description: "Timeless luxury heritage weave from Varanasi."
    },
    {
      id: 3,
      image: "/nobaraa_saree_model_3.png?v=2",
      name: "Kanjeevaram Magenta",
      description: "Vibrant royal pink and gold Kanjeevaram silk."
    }
  ];

  const modelsToUse = sareeModels && sareeModels.length > 0 ? sareeModels : defaultSareeModels;

  React.useEffect(() => {
    if (activeModel >= modelsToUse.length) {
      setActiveModel(0);
    }
  }, [modelsToUse]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveModel((prev) => (prev + 1) % Math.max(1, modelsToUse.length));
    }, 4500);
    return () => clearInterval(timer);
  }, [activeModel, modelsToUse]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const transformStyle = isHovered 
    ? { transform: `rotateX(${12 - coords.y * 15}deg) rotateY(${coords.x * 20}deg) translateZ(0px)` }
    : { animation: 'auto-float-rotate 8s ease-in-out infinite alternate' };

  return (
    <section className="nobaraa-hero-section">
      <img src="/nobaraa_flowers.png" alt="" className="nobaraa-flowers-bottom-left" />
      <img src="/nobaraa_flowers.png" alt="" className="nobaraa-flowers-top-right" />

      <div style={{ position: 'absolute', right: '15%', top: '20%', pointerEvents: 'none', zIndex: 6 }}>
        <Sparkles size={24} color="#7a4ea5" style={{ fill: '#d0bdf4', filter: 'drop-shadow(0 0 8px rgba(122,78,165,0.6))', animation: 'twinkle 4s ease-in-out infinite' }} />
      </div>
      <div style={{ position: 'absolute', right: '35%', bottom: '25%', pointerEvents: 'none', zIndex: 6 }}>
        <Sparkles size={16} color="#7a4ea5" style={{ fill: '#d0bdf4', filter: 'drop-shadow(0 0 6px rgba(122,78,165,0.4))', animation: 'twinkle 5s ease-in-out infinite 1s' }} />
      </div>
      <div style={{ position: 'absolute', right: '12%', bottom: '15%', pointerEvents: 'none', zIndex: 6 }}>
        <Sparkles size={20} color="#7a4ea5" style={{ fill: '#d0bdf4', filter: 'drop-shadow(0 0 6px rgba(122,78,165,0.4))', animation: 'twinkle 6s ease-in-out infinite 2s' }} />
      </div>

      <div className="nobaraa-hero-content">
        <h1 className="nobaraa-hero-title">
          Style That<br />
          <span className="nobaraa-hero-script">
            Defines You
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#7a4ea5" stroke="#7a4ea5" strokeWidth="1" style={{ display: 'inline-block', marginLeft: '12px', transform: 'rotate(-10deg)', verticalAlign: 'middle' }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
        </h1>
        <p className="nobaraa-hero-subtitle">
          Discover the latest trends, timeless elegance and fashion made for you.
        </p>
        <button 
          onClick={() => {
            document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
          }} 
          className="nobaraa-hero-btn"
        >
          SHOP NOW
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Center Logo Emblem */}
      <div className="nobaraa-hero-center-logo">
        <img 
          src="/nobaraa_logo_emblem.png" 
          alt="Nobaraa Fashion Logo" 
          style={{ 
            width: '250px', 
            height: '250px', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(122, 78, 165, 0.12))',
            animation: 'auto-float-rotate-logo 6s ease-in-out infinite alternate'
          }} 
        />
      </div>

      <div className="nobaraa-hero-scene-container">
        <div 
          className="nobaraa-podium-scene"
          style={transformStyle}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background Rotating Ring Logo */}
          <div style={{
            position: 'absolute',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.09,
            animation: 'spin 35s linear infinite',
            width: '380px',
            height: '380px',
            bottom: '40px',
            left: 'calc(50% - 190px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img 
              src="/nobaraa_logo_emblem.png" 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>

          <div className="nobaraa-podium-shadow"></div>
          <div className="nobaraa-podium-base">
            <div className="nobaraa-podium-top"></div>
          </div>

          {/* Saree Wear Models (fashion animated) */}
          <div className="nobaraa-model-container">
            {modelsToUse.map((model, idx) => (
              <img 
                key={model.id || idx}
                src={model.image || null} 
                alt={model.name}
                className={`nobaraa-model-image ${activeModel === idx ? 'active' : 'inactive'}`}
              />
            ))}
          </div>

          {/* Dynamic Details Floating Card */}
          <div className="nobaraa-floating-card" style={{
            position: 'absolute',
            bottom: '65px',
            left: '110px',
            width: '140px',
            minHeight: '85px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(122, 78, 165, 0.15)',
            boxShadow: '0 8px 24px rgba(122,78,165,0.12)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'rotateY(-25deg) rotateX(15deg) translateZ(105px) rotateZ(-6deg)',
            transformStyle: 'preserve-3d',
            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            cursor: 'pointer',
            zIndex: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotateY(-15deg) rotateX(10deg) translateZ(145px) rotateZ(-2deg)';
            e.currentTarget.style.boxShadow = '0 16px 36px rgba(122, 78, 165, 0.28)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotateY(-25deg) rotateX(15deg) translateZ(105px) rotateZ(-6deg)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(122,78,165,0.12)';
          }}
          >
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.5rem', color: '#7a4ea5', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Collection
            </span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 700, color: '#222222', marginTop: '2px', textAlign: 'center' }}>
              {modelsToUse[activeModel]?.name || ""}
            </span>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.55rem', color: '#666666', marginTop: '4px', textAlign: 'center', lineHeight: 1.2 }}>
              {modelsToUse[activeModel]?.description || ""}
            </span>
          </div>

          {/* Sleek Model Switcher Dots Control */}
          <div style={{
            position: 'absolute',
            bottom: '-12px',
            display: 'flex',
            gap: '10px',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(122, 78, 165, 0.15)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            transform: 'translateZ(10px)'
          }}>
            {modelsToUse.map((model, idx) => (
              <button
                key={model.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModel(idx);
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: activeModel === idx ? '#7a4ea5' : '#d0bdf4',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                title={model.name}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesBar({ isMobile }) {
  const perks = [
    {
      icon: <Award size={28} style={{ color: '#7a4ea5' }} />,
      title: "Premium Quality",
      subtitle: "Carefully selected products for the best quality and style."
    },
    {
      icon: <Truck size={28} style={{ color: '#7a4ea5' }} />,
      title: "Fast & Free Shipping",
      subtitle: "Free shipping on all orders over $50. Delivered fast."
    },
    {
      icon: <RotateCcw size={28} style={{ color: '#7a4ea5' }} />,
      title: "Easy Returns",
      subtitle: "Hassle-free returns within 30 days. Shop with confidence."
    },
    {
      icon: <Headphones size={28} style={{ color: '#7a4ea5' }} />,
      title: "24/7 Support",
      subtitle: "We're here for you anytime, anywhere. Always happy to help!"
    }
  ];

  return (
    <section style={{
      background: 'linear-gradient(to right, #ecdffa, #f5edff)',
      padding: isMobile ? '30px 20px' : '50px 60px',
      borderRadius: isMobile ? '16px' : '24px',
      margin: isMobile ? '20px auto 30px' : '40px auto 60px',
      maxWidth: isMobile ? 'calc(100% - 24px)' : 'calc(100% - 80px)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 30px rgba(122, 78, 165, 0.05)'
    }}>
      {/* Corner Flowers */}
      <img 
        src="/nobaraa_flowers.png" 
        style={{ 
          position: 'absolute', 
          bottom: isMobile ? '-20px' : '-30px', 
          left: isMobile ? '-20px' : '-30px', 
          width: isMobile ? '100px' : '180px', 
          height: 'auto', 
          opacity: 0.6, 
          transform: 'rotate(15deg)', 
          pointerEvents: 'none' 
        }} 
        alt="" 
      />
      <img 
        src="/nobaraa_flowers.png" 
        style={{ 
          position: 'absolute', 
          top: isMobile ? '-20px' : '-30px', 
          right: isMobile ? '-20px' : '-30px', 
          width: isMobile ? '100px' : '180px', 
          height: 'auto', 
          opacity: 0.6, 
          transform: 'rotate(-105deg) scaleX(-1)', 
          pointerEvents: 'none' 
        }} 
        alt="" 
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: isMobile ? '24px' : '40px', zIndex: 2, position: 'relative' }}>
        
        {/* Left Side: Pitch */}
        <div style={{ flex: '1 1 300px', maxWidth: '380px', textAlign: 'left' }}>
          <h2 style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: isMobile ? '1.8rem' : '2.5rem', 
            fontWeight: 700, 
            color: '#2b0b57', 
            lineHeight: '1.2',
            margin: '0 0 16px 0'
          }}>
            Why Choose <span style={{ fontFamily: "'Great Vibes', cursive", color: '#7a4ea5', fontSize: isMobile ? '2.4rem' : '3.2rem', display: 'block', marginTop: '2px', textTransform: 'none' }}>Nobaraa Fashion? ♡</span>
          </h2>
          <p style={{ 
            fontFamily: "'Jost', sans-serif", 
            color: '#555555', 
            fontSize: '0.95rem', 
            lineHeight: 1.6, 
            marginBottom: '24px' 
          }}>
            We bring you the best in fashion with quality you can trust and service you'll love.
          </p>
          <button 
            onClick={() => {
              const catalog = document.getElementById('catalog-section');
              if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '30px',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)',
              transition: 'transform 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            LEARN MORE <ChevronRight size={14} />
          </button>
        </div>

        {/* Right Side: Features Grid */}
        <div style={{ 
          flex: '2 2 500px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '24px' 
        }}>
          {perks.map((perk, index) => (
            <div key={index} style={{
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '16px'
            }}>
              {/* White Circular Icon Background */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 15px rgba(122, 78, 165, 0.1)',
                marginBottom: '16px',
                transition: 'transform 0.3s ease'
              }}
              className="feature-circle-icon"
              >
                {perk.icon}
              </div>
              <h4 style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontWeight: 700, 
                fontSize: '1.15rem', 
                color: '#2b0b57', 
                margin: '0 0 8px 0' 
              }}>
                {perk.title}
              </h4>
              <p style={{ 
                fontFamily: "'Jost', sans-serif", 
                fontSize: '0.82rem', 
                color: '#666666', 
                margin: 0, 
                lineHeight: 1.4 
              }}>
                {perk.subtitle}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default function App() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const googleButtonRef = useRef(null);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Session & Auth states
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [role, setRole] = useState("guest"); // guest, user, admin, super_admin
  
  // Navigation states
  const [currentView, setCurrentView] = useState("opac"); // opac, user_dashboard, admin_dashboard, super_admin_dashboard
  const [activePanel, setActivePanel] = useState(window.innerWidth <= 768 ? "menu" : "orders"); // active sub-panel in dashboards
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", contact_phone: "", password: "", addresses: [] });
  
  // Shared functional states
  const [shops, setShops] = useState([]);
  const [activeShopId, setActiveShopId] = useState(""); // Filter OPAC/User by Shop
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeCategoryPage, setActiveCategoryPage] = useState(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState(500000); // Slider
  const [searchHover, setSearchHover] = useState(false);
  
  // UI Details & Overlay states
  const [detailProduct, setDetailProduct] = useState(null);
  const [activeDetailImageIndex, setActiveDetailImageIndex] = useState(0);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeProductImageIndex, setActiveProductImageIndex] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const saved = localStorage.getItem("recentlyViewedProducts");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    if (activeProduct) {
      setRecentlyViewed(prev => {
        const filtered = prev.filter(p => p.id !== activeProduct.id);
        const updated = [activeProduct, ...filtered].slice(0, 10);
        localStorage.setItem("recentlyViewedProducts", JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeProduct]);
  const [popupAd, setPopupAd] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loginRoleTab, setLoginRoleTab] = useState("user"); // user, admin, super_admin
  const [showRegister, setShowRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [orderSuccessInfo, setOrderSuccessInfo] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [ribbonImageIndexes, setRibbonImageIndexes] = useState([0, 2, 4, 6, 8]);

  // Return requests modal and states
  const [activeReturnOrder, setActiveReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnImageUrl, setReturnImageUrl] = useState("");
  const [uploadingReturnImage, setUploadingReturnImage] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [activeTransactionOrder, setActiveTransactionOrder] = useState(null);

  const currentShop = shops.find(s => Number(s.id) === Number(activeShopId));
  const currentSareeModels = currentShop?.saree_models || [];

  const opacBanners = (currentShop?.banners || [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
      title: "THE HEIRLOOM HERITAGE",
      subtitle: "Meticulous Handloom Artistry, Exquisite Silk Weaves & Royal Zari Borders.",
      actionText: "Explore Pure Silks"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=80",
      title: "FESTIVE SOIRÉE DRESSES",
      subtitle: "Drape Yourself in Timeless Grace with Contemporary Designer Georgettes.",
      actionText: "Shop Georgettes"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=80",
      title: "NOBARAA PRIVILEGE FEST",
      subtitle: "Earn SuperCoins & Redeem Up to 30% Extra Savings on Every Elegant Drape.",
      actionText: "View Wallet"
    }
  ]).filter(b => b.id !== 3 || currentShop?.super_coin_enabled !== false);

  useEffect(() => {
    if (opacBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % opacBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [opacBanners.length]);

  useEffect(() => {
    if (currentSlide >= opacBanners.length) {
      setCurrentSlide(0);
    }
  }, [opacBanners.length, currentSlide]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRibbonImageIndexes(prev => {
        const next = [...prev];
        const ribbonIdxToChange = Math.floor(Math.random() * 5);
        let newImgIdx = Math.floor(Math.random() * 10);
        while (newImgIdx === prev[ribbonIdxToChange]) {
          newImgIdx = Math.floor(Math.random() * 10);
        }
        next[ribbonIdxToChange] = newImgIdx;
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "", name: "", contact_phone: "" });

  // User Workspace states
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("guestCart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("guestWishlist");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [myOrders, setMyOrders] = useState([]);
  const [userDashboardData, setUserDashboardData] = useState(null);
  const [userHelpTickets, setUserHelpTickets] = useState([]);
  const [userNotifications, setUserNotifications] = useState([]);
  const [checkoutData, setCheckoutData] = useState({ shipping_address: "", billing_phone: "", payment_method: "COD", coupon_code: "", use_super_coins: false, address_id: null });
  const [checkoutCustomAddress, setCheckoutCustomAddress] = useState({
    pincode: "",
    flat: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    is_default: false,
    delivery_instructions: "",
    address_type: "House",
    deliveryInstructionsExpanded: false
  });
  const [activeCustomizationCheckout, setActiveCustomizationCheckout] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "", image_url: "" });
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [newTicket, setNewTicket] = useState({ shop_id: "", subject: "", message: "" });

  // Admin Workspace states
  const [adminShop, setAdminShop] = useState(null);
  const [adminProducts, setAdminProducts] = useState([]);

  // SMTP settings and Email Template helper states
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("otp");
  const [testRecipient, setTestRecipient] = useState("");
  const [testTemplateType, setTestTemplateType] = useState("otp");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Forgot Password / OTP Login modal states
  const [forgotPasswordStep, setForgotPasswordStep] = useState('none'); // 'none', 'request', 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResetCode, setForgotResetCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  const [otpLoginStep, setOtpLoginStep] = useState('none'); // 'none', 'request', 'verify'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [adminCategories, setAdminCategories] = useState([]);
  const [adminCollections, setAdminCollections] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [bookingShippingId, setBookingShippingId] = useState(null);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminInventory, setAdminInventory] = useState(null);
  const [adminRevenue, setAdminRevenue] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
  const [adminPopupAds, setAdminPopupAds] = useState([]);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [adminHelpTickets, setAdminHelpTickets] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogTab, setAdminLogTab] = useState('all'); // 'all' | 'system' | 'smtp'
  const [billingStatus, setBillingStatus] = useState(null);
  const [adminSmsLogs, setAdminSmsLogs] = useState([]);
  const [gstReport, setGstReport] = useState(null);
  const [gstFilterDate, setGstFilterDate] = useState("");
  const [gstFilterMonth, setGstFilterMonth] = useState("");
  const [gstFilterYear, setGstFilterYear] = useState("");
  const [adminProductSearch, setAdminProductSearch] = useState("");
  const [adminProductCategoryFilter, setAdminProductCategoryFilter] = useState("");
  const [adminStartDate, setAdminStartDate] = useState("");
  const [adminEndDate, setAdminEndDate] = useState("");
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [adminOrderSearch, setAdminOrderSearch] = useState("");
  const [adminReturnsCollapsed, setAdminReturnsCollapsed] = useState(false);
  const [adminOrdersCollapsed, setAdminOrdersCollapsed] = useState(false);
  const [adminDateFilter, setAdminDateFilter] = useState("all");

  const filteredAdminOrders = adminOrders.filter(o => {
    if (!o.created_at) return true;
    const orderDate = new Date(o.created_at);
    
    // Quick Date Filters
    const now = new Date();
    if (adminDateFilter === 'today') {
      if (orderDate.toDateString() !== now.toDateString()) return false;
    } else if (adminDateFilter === 'month') {
      if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
    } else if (adminDateFilter === 'year') {
      if (orderDate.getFullYear() !== now.getFullYear()) return false;
    } else if (adminDateFilter === 'custom') {
      if (adminStartDate) {
        const start = new Date(adminStartDate + 'T00:00:00');
        if (orderDate < start) return false;
      }
      if (adminEndDate) {
        const end = new Date(adminEndDate + 'T23:59:59');
        if (orderDate > end) return false;
      }
    }
    if (adminOrderSearch) {
      const query = adminOrderSearch.toLowerCase();
      const matchId = o.id.toString().includes(query);
      const matchBuyer = o.user_name ? o.user_name.toLowerCase().includes(query) : false;
      const matchAddress = o.shipping_address ? o.shipping_address.toLowerCase().includes(query) : false;
      const matchMethod = o.payment_method ? o.payment_method.toLowerCase().includes(query) : false;
      const matchStatus = o.status ? o.status.toLowerCase().includes(query) : false;
      const matchRP = o.razorpay_payment_id ? o.razorpay_payment_id.toLowerCase().includes(query) : false;
      const matchItems = o.items ? o.items.some(item => item.product_name && item.product_name.toLowerCase().includes(query)) : false;
      
      if (!matchId && !matchBuyer && !matchAddress && !matchMethod && !matchStatus && !matchRP && !matchItems) {
        return false;
      }
    }
    return true;
  });
  
  const filteredAdminProducts = adminProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(adminProductSearch.toLowerCase()) || 
                          p.id.toString().includes(adminProductSearch);
    const matchesCategory = !adminProductCategoryFilter || 
                            p.category_id?.toString() === adminProductCategoryFilter.toString();
    return matchesSearch && matchesCategory;
  });
  
  // Admin edits/creations
  const [productForm, setProductForm] = useState({ id: null, name: "", description: "", price: "", original_price: "", stock: "", alert_threshold: 5, images: [""], category_id: "", promo_code: "", promo_discount: "", bulk_sale_price: "", min_quantity: "", customization_enabled: false, barcode: "", sku_code: "", hsc_code: "", return_window_days: "" });
  const [purchaseMode, setPurchaseMode] = useState("single"); // single or bulk
  const [categoryForm, setCategoryForm] = useState({ id: null, name: "", description: "", image_url: "", return_window_days: "", shipping_charge: "" });
  const [collectionForm, setCollectionForm] = useState({ id: null, name: "", category_ids: [], separate_categories_mobile: false, show_category_banner: true });
  const [couponForm, setCouponForm] = useState({ id: null, code: "", discount_percentage: "", max_discount: 1000, min_purchase: 0, is_active: true });
  const [adForm, setAdForm] = useState({ id: null, title: "", image_url: "", target_url: "", show_before_login: true, show_after_login: true, is_active: true });
  const [messagingForm, setMessagingForm] = useState({ platform: "SMS", recipient: "All Customers", message: "" });
  const [ticketReplyForm, setTicketReplyForm] = useState({ ticket_id: "", reply: "" });

  // Customization States
  const [selectedCustomCategory, setSelectedCustomCategory] = useState("");
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedCustomColor, setSelectedCustomColor] = useState(null);
  const [customSizingNotes, setCustomSizingNotes] = useState("");
  const [customQuantity, setCustomQuantity] = useState(1);
  const [submittingCustomOrder, setSubmittingCustomOrder] = useState(false);
  const [userCustomizations, setUserCustomizations] = useState([]);
  const [adminCustomizations, setAdminCustomizations] = useState([]);
  const [quoteInputs, setQuoteInputs] = useState({});
  const [sharingProduct, setSharingProduct] = useState(null);
  const [activeReviewImagePreview, setActiveReviewImagePreview] = useState(null);


  // Super Admin Workspace states
  const [superShops, setSuperShops] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [superLogs, setSuperLogs] = useState([]);
  const [superLogTab, setSuperLogTab] = useState('all'); // 'all' | 'system' | 'smtp'
  const [superOrders, setSuperOrders] = useState([]);
  const [superCustomers, setSuperCustomers] = useState([]);
  const [superCustomerSearch, setSuperCustomerSearch] = useState("");
  
  // Super Admin forms
  const [shopForm, setShopForm] = useState({ id: null, name: "", logo_url: "", contact_email: "", contact_phone: "", privacy_policy: "", address: "", sms_api_key: "", whatsapp_api_key: "", razorpay_key_id: "", razorpay_key_secret: "", super_coin_enabled: true, super_coin_ratio: 10, gst_percentage: 18.0, gst_inclusive: false });
  const [newAdminForm, setNewAdminForm] = useState({ id: null, username: "", password: "", email: "", name: "", shop_id: "" });

  // Add a Toast Notification helper
  const addToast = (title, message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const renderLogDescription = (action) => {
    if (action && action.startsWith('[SMTP]')) {
      const isSuccess = action.includes('SUCCESS');
      const typeMatch = action.match(/Type:\s*([^\s|]+)/);
      const toMatch = action.match(/To:\s*([^\s|()]+)/);
      const errMatch = action.match(/\(Error:\s*([^)]+)\)/);
      
      const type = typeMatch ? typeMatch[1] : 'unknown';
      const recipient = toMatch ? toMatch[1] : 'unknown';
      const error = errMatch ? errMatch[1] : null;

      const badgeColor = isSuccess ? 'var(--accent-primary, #9a84c8)' : 'var(--accent-danger, #e84e7e)';
      const typeLabel = type.toUpperCase().replace('_', ' ');

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ 
              background: isSuccess ? 'rgba(154, 132, 200, 0.1)' : 'rgba(232, 78, 126, 0.1)', 
              color: badgeColor, 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem', 
              fontWeight: 700 
            }}>
              {isSuccess ? 'SENT' : 'FAILED'}
            </span>
            <span style={{ 
              background: '#f3f0f7', 
              color: '#5c3a85', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Mail size={12} /> {typeLabel}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Recipient: <strong style={{ color: 'var(--text-main)' }}>{recipient}</strong>
            </span>
          </div>
          {!isSuccess && error && (
            <span style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600 }}>Error:</span> {error}
            </span>
          )}
        </div>
      );
    }
    return action;
  };

  const handleUploadFile = async (file, onUploadComplete) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      onUploadComplete(data.url);
      addToast("Upload Successful", "The image was uploaded to the local server.", "success");
    } catch (err) {
      console.error(err);
      addToast("Upload Failed", err.message || "Failed to upload image.", "danger");
    }
  };

  const handleProductSelection = (productId) => {
    fetch(`${API_BASE}/opac/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (role === 'user') {
          setActiveProduct(data);
          setActiveProductImageIndex(0);
          setCurrentView('product_detail');
          window.scrollTo(0, 0);
        } else {
          setDetailProduct(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch product detail:", err);
        addToast("Error", "Could not load product details.", "danger");
      });
  };

  // Auth Headers helper
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const refreshUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/profile`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user || data);
        localStorage.setItem('user', JSON.stringify(data.user || data));
      }
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  // Default address pre-selection when checking out
  useEffect(() => {
    if (currentView === 'checkout' && user) {
      const savedAddresses = user.addresses || [];
      if (savedAddresses.length > 0) {
        const lastUsedId = user.last_used_address_id;
        const lastUsedAddr = savedAddresses.find(addr => addr.id === lastUsedId);
        const defaultAddr = lastUsedAddr || savedAddresses[0];
        
        setCheckoutData(prev => ({
          ...prev,
          shipping_address: defaultAddr.address,
          billing_phone: defaultAddr.phone || user.contact_phone || "",
          address_id: defaultAddr.id
        }));
      } else {
        setCheckoutData(prev => ({
          ...prev,
          shipping_address: "",
          billing_phone: user.contact_phone || "",
          address_id: null
        }));
      }
    }
  }, [currentView, user]);

  const formatAddressString = (addr) => {
    if (!addr) return "";
    const parts = [
      addr.flat,
      addr.area,
      addr.landmark ? `Landmark: ${addr.landmark}` : null,
      addr.city,
      addr.state ? `${addr.state} - ${addr.pincode}` : addr.pincode
    ].filter(Boolean);
    const base = parts.join(", ");
    return addr.delivery_instructions
      ? `${base} (Instructions: ${addr.delivery_instructions})`
      : base;
  };

  useEffect(() => {
    if (checkoutData.address_id === null) {
      const finalAddress = formatAddressString(checkoutCustomAddress);
      setCheckoutData(prev => ({
        ...prev,
        shipping_address: finalAddress
      }));
    }
  }, [checkoutCustomAddress, checkoutData.address_id]);

  // Reset customization checkout state if navigated away from checkout
  useEffect(() => {
    if (currentView !== 'checkout') {
      setActiveCustomizationCheckout(null);
    }
  }, [currentView]);

  // INITIAL LOADS (OPAC)
  useEffect(() => {
    // Check LocalStorage on boot
    const cachedToken = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    const cachedRole = localStorage.getItem('role');

    let currentRole = null;
    if (cachedToken && cachedUser && cachedRole) {
      setToken(cachedToken);
      setUser(JSON.parse(cachedUser));
      setRole(cachedRole);
      currentRole = cachedRole;
      
      // Auto Route depending on role
      if (cachedRole === 'user') {
        setCurrentView("opac");
        setActivePanel("orders");
      } else if (cachedRole === 'admin') {
        setCurrentView("admin_dashboard");
        setActivePanel("shop_config");
      } else if (cachedRole === 'super_admin') {
        setCurrentView("super_admin_dashboard");
        setActivePanel("shop_creation");
      }
    }
    
    fetchShops();

    // Check if deep linking product parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    const sharedProdId = urlParams.get('product');
    if (sharedProdId) {
      fetch(`${API_BASE}/opac/products/${sharedProdId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            if (currentRole === 'user') {
              setActiveProduct(data);
              setActiveProductImageIndex(0);
              setCurrentView('product_detail');
              window.scrollTo(0, 0);
            } else {
              setDetailProduct(data);
            }
          }
        })
        .catch(err => console.error("Failed to load shared product", err));
    }
  }, [token]);

  // Load products when activeShopId, searchQuery, category, price changes
  useEffect(() => {
    fetchOPACProducts();
  }, [activeShopId, selectedCategory, searchQuery, priceFilter]);

  // Load OPAC Popup ad when activeShopId changes
  useEffect(() => {
    if (activeShopId) {
      fetchOPACPopupAd();
    } else {
      setPopupAd(null);
    }
  }, [activeShopId, role]);

  // Reset active image index when detail product modal opens/changes
  useEffect(() => {
    setActiveDetailImageIndex(0);
  }, [detailProduct]);

  // Scroll reveal observer for staggered scroll transitions
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -50px 0px",
      threshold: 0.05
    });

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, [products, currentView, loadingProducts, activeCategoryPage]);

  // FETCH ROUTINES
  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_BASE}/opac/shops`);
      const data = await res.json();
      if (res.ok) {
        setShops(data);
        if (data.length > 0 && !activeShopId) {
          // Default to first shop
          setActiveShopId(data[0].id);
        }
      }
    } catch (e) {
      addToast("Connection Error", "Could not reach backend API.", "danger");
    }
  };

  const fetchOPACProducts = async () => {
    try {
      setLoadingProducts(true);
      let url = `${API_BASE}/opac/products?max_price=${priceFilter}`;
      if (activeShopId) url += `&shop_id=${activeShopId}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;
      if (searchQuery) url += `&search=${searchQuery}`;

      // 400ms delay for smooth loading transitions
      await new Promise(resolve => setTimeout(resolve, 400));

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOPACPopupAd = async () => {
    try {
      const type = role === 'guest' ? 'before' : 'after';
      const res = await fetch(`${API_BASE}/opac/popup-ads?shop_id=${activeShopId}&display_type=${type}`);
      const data = await res.json();
      if (res.ok && data.length > 0) {
        // Show first active popup ad
        setPopupAd(data[0]);
      } else {
        setPopupAd(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch shop-specific categories and collections
  useEffect(() => {
    if (activeShopId) {
      fetchCategories();
      fetchCollections();
    }
  }, [activeShopId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/opac/categories?shop_id=${activeShopId}`);
      const data = await res.json();
      if (res.ok) {
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch(`${API_BASE}/opac/collections?shop_id=${activeShopId}`);
      const data = await res.json();
      if (res.ok) {
        setCollections(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // USER ACTION HANDLERS
  const handleUserLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginForm, shop_id: activeShopId })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);

        setToken(data.token);
        setUser(data.user);
        setRole(data.user.role);
        setShowLoginModal(false);
        setLoginForm({ username: "", password: "" });
        addToast("Authentication Success", `Logged in successfully as ${data.user.name || data.user.username}.`, "success");
        
        // Navigation redirect
        if (data.user.role === 'user') {
          setCurrentView("opac");
          setActivePanel("orders");
        } else if (data.user.role === 'admin') {
          setCurrentView("admin_dashboard");
          setActivePanel("shop_config");
        } else if (data.user.role === 'super_admin') {
          setCurrentView("super_admin_dashboard");
          setActivePanel("shop_creation");
        }
      } else {
        addToast("Authentication Failed", data.error || "Invalid credentials.", "danger");
      }
    } catch (err) {
      addToast("Server Error", "Could not complete login request.", "danger");
    }
  };

  const handleUserRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerForm, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', 'user');

        setToken(data.token);
        setUser(data.user);
        setRole('user');
        setShowLoginModal(false);
        setShowRegister(false);
        setRegisterForm({ username: "", email: "", password: "", name: "", contact_phone: "" });
        addToast("Registration Success", "Account created successfully! Enjoy your 50 free SuperCoins.", "success");
        
        setCurrentView("opac");
        setActivePanel("orders");
      } else {
        addToast("Registration Failed", data.error || "Validation failed.", "danger");
      }
    } catch (err) {
      addToast("Server Error", "Could not complete registration.", "danger");
    }
  };

  useEffect(() => {
    if (!showLoginModal || loginRoleTab !== 'user') {
      return undefined;
    }

    if (Capacitor.isNativePlatform()) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 12px; border: 1px solid #d8c8ee; background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%); color: #6f46a8; font-size: 0.92rem; font-weight: 600; box-shadow: 0 8px 18px rgba(122, 78, 165, 0.08); cursor: pointer; transition: all 0.2s;';
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>Continue with Google';
        
        btn.addEventListener('click', async () => {
          try {
            const user = await GoogleAuth.signIn();
            const idToken = user.authentication.idToken;
            const res = await fetch(`${API_BASE}/user/google-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: idToken, shop_id: activeShopId })
            });
            const data = await res.json();
            if (!res.ok) {
              addToast("Google Sign-In Failed", data.error || "Unable to sign in with Google.", "danger");
              return;
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', data.user.role);
            setToken(data.token);
            setUser(data.user);
            setRole(data.user.role);
            setShowLoginModal(false);
            setLoginForm({ username: "", password: "" });
            addToast("Authentication Success", `Logged in successfully as ${data.user.name || data.user.username}.`, "success");
            setCurrentView("opac");
            setActivePanel("orders");
          } catch (err) {
            console.error(err);
            addToast("Google Sign-In Cancelled", err.message || "Sign in cancelled.", "danger");
          }
        });
        
        googleButtonRef.current.appendChild(btn);
      }
      return () => {
        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
        }
      };
    }

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '<button type="button" disabled style="width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 12px; border: 1px solid #d8c8ee; background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%); color: #6f46a8; font-size: 0.92rem; font-weight: 600; box-shadow: 0 8px 18px rgba(122, 78, 165, 0.08); cursor: not-allowed; opacity: 0.95;"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>Continue with Google</button>';
      }
      return undefined;
    }

    let cancelled = false;

    const setupGoogleButton = async () => {
      const loaded = await loadGoogleIdentityScript();
      if (cancelled || !loaded || !googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      googleButtonRef.current.innerHTML = '';

      const handleCredentialResponse = async (response) => {
        try {
          const res = await fetch(`${API_BASE}/user/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential, shop_id: activeShopId })
          });
          const data = await res.json();

          if (!res.ok) {
            addToast("Google Sign-In Failed", data.error || "Unable to sign in with Google.", "danger");
            return;
          }

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('role', data.user.role);

          setToken(data.token);
          setUser(data.user);
          setRole(data.user.role);
          setShowLoginModal(false);
          setLoginForm({ username: "", password: "" });
          addToast("Authentication Success", `Logged in successfully as ${data.user.name || data.user.username}.`, "success");

          setCurrentView("opac");
          setActivePanel("orders");
        } catch (err) {
          addToast("Server Error", "Could not complete Google sign-in.", "danger");
        }
      };

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleButtonRef.current.clientWidth || 440,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      });
    };

    setupGoogleButton();

    return () => {
      cancelled = true;
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
    };
  }, [showLoginModal, loginRoleTab, showRegister]);

  const handleLogout = async () => {
    try {
      let endpoint = "/user/logout";
      if (role === 'admin') endpoint = "/admin/logout";
      if (role === 'super_admin') endpoint = "/super-admin/logout";

      await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: endpoint === "/user/logout" ? JSON.stringify({ shop_id: activeShopId }) : undefined
      });
    } catch (e) {}

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');

    setToken("");
    setUser(null);
    setRole("guest");
    setCurrentView("opac");
    setActivePanel(window.innerWidth <= 768 ? "menu" : "orders");

    // Restore guest cart and wishlist
    try {
      const savedCart = localStorage.getItem("guestCart");
      setCart(savedCart ? JSON.parse(savedCart) : []);
      const savedWishlist = localStorage.getItem("guestWishlist");
      setWishlist(savedWishlist ? JSON.parse(savedWishlist) : []);
    } catch (e) {
      setCart([]);
      setWishlist([]);
    }

    addToast("Session Closed", "You have logged out successfully.", "info");
  };

  // LOGGED IN USER SPECIFIC ROUTINES
  useEffect(() => {
    if (role === 'user') {
      if (currentView === 'user_dashboard') {
        loadUserDashboard();
        if (activePanel === 'cart') loadUserCart();
        if (activePanel === 'wishlist') loadUserWishlist();
        if (activePanel === 'orders') loadUserOrders();
        if (activePanel === 'customizations') loadUserCustomizations();
        if (activePanel === 'help_center') loadUserHelpTickets();
        if (activePanel === 'notifications') loadUserNotifications();
        if (activePanel === 'settings') {
          const mappedAddresses = (user?.addresses || []).map(addr => ({
            id: addr.id || Date.now(),
            label: addr.label || "House",
            phone: addr.phone || user?.contact_phone || "",
            pincode: addr.pincode || "",
            flat: addr.flat !== undefined ? addr.flat : (addr.address || ""),
            area: addr.area || "",
            landmark: addr.landmark || "",
            city: addr.city || "",
            state: addr.state || "",
            is_default: addr.is_default || false,
            delivery_instructions: addr.delivery_instructions || "",
            address_type: addr.address_type || "House",
            deliveryInstructionsExpanded: !!addr.delivery_instructions,
            address: addr.address || ""
          }));
          setProfileForm({
            name: user?.name || "",
            email: user?.email || "",
            contact_phone: user?.contact_phone || "",
            password: "",
            addresses: mappedAddresses
          });
        }
      } else {
        loadUserDashboard();
        loadUserCart();
        loadUserWishlist();
      }
    }
  }, [role, currentView, activePanel, user]);

  const handleAddressFieldChange = (id, field, value) => {
    setProfileForm(prev => {
      const updatedAddresses = prev.addresses.map(addr => {
        if (addr.id === id) {
          const updated = { ...addr, [field]: value };
          if (field === 'is_default' && value === true) {
            updated.is_default = true;
          }
          updated.address = formatAddressString(updated);
          return updated;
        } else {
          const updated = { ...addr };
          if (field === 'is_default' && value === true) {
            updated.is_default = false;
          }
          return updated;
        }
      });
      return { ...prev, addresses: updatedAddresses };
    });
  };

  const handleDeleteAddress = (id) => {
    setProfileForm(prev => ({
      ...prev,
      addresses: prev.addresses.filter(addr => addr.id !== id)
    }));
  };

  const handleAddAddress = () => {
    const newAddr = {
      id: Date.now(),
      label: "House",
      phone: profileForm.contact_phone || "",
      pincode: "",
      flat: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
      is_default: false,
      delivery_instructions: "",
      address_type: "House",
      deliveryInstructionsExpanded: false,
      address: ""
    };
    setProfileForm(prev => ({
      ...prev,
      addresses: [...(prev.addresses || []), newAddr]
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileForm.addresses && profileForm.addresses.length > 0) {
      for (let i = 0; i < profileForm.addresses.length; i++) {
        const addr = profileForm.addresses[i];
        if (!addr.phone || !addr.phone.trim()) {
          addToast("Validation Error", `Please enter a Contact Phone for Address #${i + 1}.`, "warning");
          return;
        }
        if (!addr.pincode || addr.pincode.trim().length !== 6 || isNaN(addr.pincode)) {
          addToast("Validation Error", `Please enter a valid 6-digit Pincode for Address #${i + 1}.`, "warning");
          return;
        }
        if (!addr.flat || !addr.flat.trim()) {
          addToast("Validation Error", `Please enter Flat, House no. details for Address #${i + 1}.`, "warning");
          return;
        }
        if (!addr.area || !addr.area.trim()) {
          addToast("Validation Error", `Please enter Area, Street details for Address #${i + 1}.`, "warning");
          return;
        }
        if (!addr.city || !addr.city.trim()) {
          addToast("Validation Error", `Please enter Town/City for Address #${i + 1}.`, "warning");
          return;
        }
        if (!addr.state) {
          addToast("Validation Error", `Please select a State for Address #${i + 1}.`, "warning");
          return;
        }
      }
    }
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...profileForm, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Profile Updated", "Your account settings have been saved successfully.", "success");
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        addToast("Update Failed", data.error || "Could not update profile.", "danger");
      }
    } catch (err) {
      addToast("Server Error", "Could not complete profile update request.", "danger");
    }
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!showProfileDropdown) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.desktop-nav-icons')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showProfileDropdown]);

  const loadUserDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/dashboard`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUserDashboardData(data);
      }
    } catch (e) {}
  };

  const loadUserCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/cart`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setCart(data);
      }
    } catch (e) {}
  };

  const loadUserWishlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/wishlist`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setWishlist(data);
      }
    } catch (e) {}
  };

  const loadUserOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/orders`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setMyOrders(data);
      }
    } catch (e) {}
  };

  const loadUserCustomizations = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/customizations`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUserCustomizations(data);
      }
    } catch (e) {}
  };

  const handleQuoteAction = async (custId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this price quote?`)) return;
    try {
      const res = await fetch(`${API_BASE}/user/customizations/${custId}/quote-action`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Quote Updated", `You have successfully ${action}ed the quote.`, "success");
        loadUserCustomizations();
      } else {
        addToast("Error", data.error || `Failed to ${action} quote.`, "danger");
      }
    } catch (err) {
      addToast("Error", err.message, "danger");
    }
  };


  const loadUserHelpTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/help-tickets`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUserHelpTickets(data);
      }
    } catch (e) {}
  };

  const loadUserNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/notifications`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUserNotifications(data);
      }
    } catch (e) {}
  };

  const handleAddToCart = async (productId, qty = 1, showToast = true) => {
    if (role !== 'user') {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      
      setCart(prev => {
        const existing = prev.find(item => item.product_id === productId);
        let newCart;
        if (existing) {
          const newQty = qty === 1 ? existing.quantity + 1 : qty;
          if (newQty > prod.stock) {
            addToast("Stock Limit", `Only ${prod.stock} units available.`, "warning");
            return prev;
          }
          newCart = prev.map(item => 
            item.product_id === productId 
              ? { ...item, quantity: newQty }
              : item
          );
        } else {
          if (qty > prod.stock) {
            addToast("Stock Limit", `Only ${prod.stock} units available.`, "warning");
            return prev;
          }
          newCart = [...prev, {
            id: "guest_" + productId,
            product_id: productId,
            quantity: qty,
            product: prod
          }];
        }
        localStorage.setItem("guestCart", JSON.stringify(newCart));
        return newCart;
      });
      if (showToast) {
        addToast("Added to Cart", "Product added successfully to your shopping cart.", "success");
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/cart`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: productId, quantity: qty })
      });
      const data = await res.json();
      if (res.ok) {
        if (showToast) {
          addToast("Added to Cart", "Product added successfully to your shopping cart.", "success");
        }
        loadUserCart();
      } else {
        addToast("Cart Error", data.error || "Out of stock.", "danger");
      }
    } catch (e) {}
  };

  const handleAddToWishlist = async (productId) => {
    if (role !== 'user') {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;

      setWishlist(prev => {
        const existing = prev.find(item => item.product_id === productId);
        if (existing) {
          addToast("Wishlist", "This item is already pinned in your wishlist.", "info");
          return prev;
        }
        const newWishlist = [...prev, {
          id: "guest_" + productId,
          product_id: productId,
          product: prod
        }];
        localStorage.setItem("guestWishlist", JSON.stringify(newWishlist));
        return newWishlist;
      });
      addToast("Wishlisted", "Product pinned in your wishlist.", "success");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/wishlist`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: productId })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Wishlisted", "Product pinned in your wishlist.", "success");
        loadUserWishlist();
      }
    } catch (e) {}
  };

  const handleRemoveFromCart = async (cartItemId) => {
    if (role !== 'user') {
      setCart(prev => {
        const newCart = prev.filter(item => item.id !== cartItemId);
        localStorage.setItem("guestCart", JSON.stringify(newCart));
        return newCart;
      });
      addToast("Item Removed", "Removed from cart.", "info");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/cart/${cartItemId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Item Removed", "Removed from cart.", "info");
        loadUserCart();
      }
    } catch (e) {}
  };

  const handleRemoveFromWishlist = async (wishlistItemId) => {
    if (role !== 'user') {
      setWishlist(prev => {
        const newWishlist = prev.filter(item => item.id !== wishlistItemId);
        localStorage.setItem("guestWishlist", JSON.stringify(newWishlist));
        return newWishlist;
      });
      addToast("Item Removed", "Removed from wishlist.", "info");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/wishlist/${wishlistItemId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Item Removed", "Removed from wishlist.", "info");
        loadUserWishlist();
      }
    } catch (e) {}
  };

  // Submit support ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/user/help-tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...newTicket, shop_id: activeShopId })
      });
      if (res.ok) {
        addToast("Ticket Created", "Help center agent assigned. We will reply shortly.", "success");
        setNewTicket({ shop_id: "", subject: "", message: "" });
        loadUserHelpTickets();
      }
    } catch (e) {}
  };

  // Submit product review
  const handleCreateReview = async (e, productId) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/user/reviews`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          product_id: productId, 
          rating: newReview.rating, 
          comment: newReview.comment,
          image_url: newReview.image_url || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Review Posted", "Thank you! Your verified customer review is active.", "success");
        setNewReview({ rating: 5, comment: "", image_url: "" });
        // Reload detail product to see the review immediately!
        if (detailProduct && detailProduct.id === productId) {
          const detailRes = await fetch(`${API_BASE}/opac/products/${productId}`);
          const detailData = await detailRes.json();
          if (detailRes.ok) setDetailProduct(detailData);
        }
        // Reload activeProduct if currently showing it in the main product details view
        if (activeProduct && activeProduct.id === productId) {
          const detailRes = await fetch(`${API_BASE}/opac/products/${productId}`);
          const detailData = await detailRes.json();
          if (detailRes.ok) setActiveProduct(detailData);
        }
      } else {
        addToast("Cannot Review", data.error || "Reviews allowed only for verified buyers.", "danger");
      }
    } catch (e) {}
  };

  // Upload review image
  const handleUploadReviewImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingReviewImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewReview(prev => ({ ...prev, image_url: data.url }));
        addToast("Image Uploaded", "Your photo was successfully attached.", "success");
      } else {
        addToast("Upload Failed", data.error || "Could not upload image.", "danger");
      }
    } catch (err) {
      addToast("Upload Error", "An error occurred during file upload.", "danger");
    } finally {
      setIsUploadingReviewImage(false);
    }
  };

  // File Return Request
  const handleRequestReturn = async (orderId, reason, return_image_url) => {
    try {
      const res = await fetch(`${API_BASE}/user/orders/${orderId}/return`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason, return_image_url })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Return Requested", "Pending admin validation approval.", "warning");
        loadUserOrders();
      } else {
        addToast("Error", data.error, "danger");
      }
    } catch (e) {}
  };

  // Place Order Checkout
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // Custom address validation
    if (checkoutData.address_id === null) {
      if (!checkoutCustomAddress.pincode || checkoutCustomAddress.pincode.trim().length !== 6 || isNaN(checkoutCustomAddress.pincode)) {
        addToast("Validation Error", "Please enter a valid 6-digit Pincode.", "warning");
        return;
      }
      if (!checkoutCustomAddress.flat || !checkoutCustomAddress.flat.trim()) {
        addToast("Validation Error", "Please enter Flat, House no., or Building details.", "warning");
        return;
      }
      if (!checkoutCustomAddress.area || !checkoutCustomAddress.area.trim()) {
        addToast("Validation Error", "Please enter Area, Street, or Sector details.", "warning");
        return;
      }
      if (!checkoutCustomAddress.city || !checkoutCustomAddress.city.trim()) {
        addToast("Validation Error", "Please enter Town/City.", "warning");
        return;
      }
      if (!checkoutCustomAddress.state) {
        addToast("Validation Error", "Please select a State.", "warning");
        return;
      }
    }
    if (!checkoutData.billing_phone || !checkoutData.billing_phone.trim()) {
      addToast("Validation Error", "Please enter a Billing Phone number.", "warning");
      return;
    }

    try {
      const checkoutUrl = activeCustomizationCheckout
        ? `${API_BASE}/user/customizations/${activeCustomizationCheckout.id}/checkout`
        : `${API_BASE}/user/orders`;

      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...checkoutData, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        const saveCustomAddressToProfile = async () => {
          if (checkoutData.address_id === null && checkoutCustomAddress.is_default && user) {
            try {
              const newAddr = {
                id: Date.now(),
                label: checkoutCustomAddress.address_type || "House",
                phone: checkoutData.billing_phone || user.contact_phone || "",
                pincode: checkoutCustomAddress.pincode,
                flat: checkoutCustomAddress.flat,
                area: checkoutCustomAddress.area,
                landmark: checkoutCustomAddress.landmark,
                city: checkoutCustomAddress.city,
                state: checkoutCustomAddress.state,
                is_default: true,
                delivery_instructions: checkoutCustomAddress.delivery_instructions,
                address_type: checkoutCustomAddress.address_type,
                address: checkoutData.shipping_address
              };
              const existingAddresses = (user.addresses || []).map(addr => ({
                ...addr,
                is_default: false
              }));
              const updatedAddresses = [...existingAddresses, newAddr];
              const profileRes = await fetch(`${API_BASE}/user/profile`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                  name: user.name,
                  email: user.email,
                  contact_phone: user.contact_phone,
                  addresses: updatedAddresses,
                  shop_id: activeShopId
                })
              });
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setUser(profileData.user);
                localStorage.setItem('user', JSON.stringify(profileData.user));
              }
            } catch (err) {
              console.error("Auto-save address failed", err);
            }
          }
        };

        const clearCheckoutFields = () => {
          setCheckoutData({ shipping_address: "", billing_phone: "", payment_method: "COD", coupon_code: "", use_super_coins: false, address_id: null });
          const wasCustom = !!activeCustomizationCheckout;
          setActiveCustomizationCheckout(null);
          refreshUserProfile();
          if (wasCustom) {
            loadUserCustomizations();
            setActivePanel("customizations");
            setCurrentView("user_dashboard");
          } else {
            setActivePanel("orders");
          }
        };

        if ((activeCustomizationCheckout ? data.customization.payment_method : data.order.payment_method) === 'UPI') {
          // Dynamic script loader for Razorpay Checkout
          const loadRazorpay = () => {
            return new Promise((resolve) => {
              if (window.Razorpay) {
                resolve(true);
                return;
              }
              const script = document.createElement('script');
              script.src = 'https://checkout.razorpay.com/v1/checkout.js';
              script.onload = () => resolve(true);
              script.onerror = () => resolve(false);
              document.body.appendChild(script);
            });
          };

          const sdkLoaded = await loadRazorpay();
          if (!sdkLoaded) {
            addToast("Payment Error", "Razorpay SDK failed to load. Please check your internet connection.", "danger");
            return;
          }

          if (data.razorpay_key_id === "rzp_test_auraId98" || data.razorpay_key_id === "rzp_test_vogueId44" || data.razorpay_key_id === "rzp_test_greenId12" || data.razorpay_key_id === "YOUR_RAZORPAY_KEY_ID" || !data.razorpay_key_id) {
            addToast("Test Key Active", "Using default dummy key. To avoid Razorpay validation errors, please configure your own valid Razorpay Key in Admin Shop Config.", "warning");
          }

          const options = {
            key: data.razorpay_key_id || "rzp_test_auraId98",
            amount: data.amount_paise,
            currency: 'INR',
            name: currentShop ? currentShop.name : "Nobaraa",
            description: activeCustomizationCheckout
              ? `Customization Payment ${getDisplayCustomizationNumber(data.customization)}`
              : `Order Payment ${getDisplayOrderNumber(data.order)}`,
            handler: async function (paymentResponse) {
              try {
                const verifyUrl = activeCustomizationCheckout
                  ? `${API_BASE}/user/customizations/${activeCustomizationCheckout.id}/verify`
                  : `${API_BASE}/user/orders/verify`;

                const verifyBody = activeCustomizationCheckout
                  ? {
                      ...checkoutData,
                      shop_id: activeShopId,
                      razorpay_order_id: paymentResponse.razorpay_order_id || null,
                      razorpay_payment_id: paymentResponse.razorpay_payment_id,
                      razorpay_signature: paymentResponse.razorpay_signature || null
                    }
                  : {
                      ...checkoutData,
                      shop_id: activeShopId,
                      order_id: data.order?.id || null,
                      razorpay_order_id: paymentResponse.razorpay_order_id || null,
                      razorpay_payment_id: paymentResponse.razorpay_payment_id,
                      razorpay_signature: paymentResponse.razorpay_signature || null
                    };

                const verifyRes = await fetch(verifyUrl, {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify(verifyBody)
                });
                
                const verifyData = await verifyRes.json();
                if (verifyRes.ok) {
                  addToast("Payment Successful", "Your payment has been successfully verified! Order confirmed.", "success");
                  const orderId = activeCustomizationCheckout
                    ? getDisplayCustomizationNumber(verifyData.customization)
                    : getDisplayOrderNumber(verifyData.order);
                  setOrderSuccessInfo({ orderId });
                  await saveCustomAddressToProfile();
                  clearCheckoutFields();
                } else {
                  addToast("Payment Verification Failed", verifyData.error || "Failed to verify payment signature.", "danger");
                }
              } catch (verifyErr) {
                addToast("Payment Verification Error", "Could not complete payment verification.", "danger");
              }
            },
            prefill: {
              name: data.user_name,
              email: data.user_email,
              contact: data.user_phone
            },
            theme: {
              color: "#7a4ea5"
            },
            modal: {
              ondismiss: function () {
                addToast("Payment Cancelled", "Payment window closed. You can try checking out again.", "warning");
              }
            }
          };

          if (data.razorpay_order_id) {
            options.order_id = data.razorpay_order_id;
          }

          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
        } else {
          // Standard COD checkout or mock completion fallback
          if (activeCustomizationCheckout) {
            addToast("Custom Order Confirmed", "Your custom order request is accepted and in progress.", "success");
          } else if (data.order.payment_method === 'COD') {
            addToast("Order Confirmed", "Your purchase is successful. Invoice will be generated after admin accepts the order.", "success");
          } else {
            addToast("Order Confirmed", "Your purchase is successful. Order placed.", "success");
          }

          const orderId = activeCustomizationCheckout
            ? getDisplayCustomizationNumber(data.customization)
            : getDisplayOrderNumber(data.order);
          setOrderSuccessInfo({ orderId });

          await saveCustomAddressToProfile();
          clearCheckoutFields();
        }
      } else {
        addToast("Checkout Error", data.error || "Failed to process checkout.", "danger");
      }
    } catch (err) {
      addToast("Checkout Error", "Failed to contact e-commerce checkout service.", "danger");
    }
  };

  // ADMIN ACTION ROUTINES
  useEffect(() => {
    if (role === 'admin' && currentView === 'admin_dashboard') {
      if (activePanel === 'shop_config') loadAdminShop();
      if (activePanel === 'categories') loadAdminCategories();
      if (activePanel === 'collections') { loadAdminCollections(); loadAdminCategories(); }
      if (activePanel === 'products') { loadAdminProducts(); loadAdminCategories(); }
      if (activePanel === 'orders') loadAdminOrders();
      if (activePanel === 'inventory') loadAdminInventory();
      if (activePanel === 'revenue') loadAdminRevenue();
      if (activePanel === 'popup_ads') loadAdminPopupAds();
      if (activePanel === 'coupons') loadAdminCoupons();
      if (activePanel === 'help_center') loadAdminHelpTickets();
      if (activePanel === 'logs') loadAdminLogs();
      if (activePanel === 'messaging') loadAdminSmsLogs();
      if (activePanel === 'gst_report') loadGstReport(gstFilterDate, gstFilterMonth, gstFilterYear);
      if (activePanel === 'customers') loadAdminCustomers();
      if (activePanel === 'customizations') {
        loadAdminCustomizations();
        loadAdminCategories();
        loadAdminProducts();
        loadAdminShop();
      }
      if (activePanel === 'billing_heartbeat') loadBillingHeartbeat();
    }
  }, [role, currentView, activePanel, gstFilterDate, gstFilterMonth, gstFilterYear]);

  const loadAdminShop = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/shop`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminShop(data);
    } catch (e) {}
  };

  const loadBillingHeartbeat = async () => {
    try {
      if (!adminShop || !adminShop.billing_api_key) {
        setBillingStatus({ error: 'No billing API key configured' });
        return;
      }
      const url = `${API_BASE}/billing/sync/status?api_key=${encodeURIComponent(adminShop.billing_api_key)}`;
      const res = await fetch(url, { headers: getHeaders() });
      const j = await res.json();
      if (res.ok) setBillingStatus(j.billing_status || null);
      else setBillingStatus({ error: j.error || 'Unable to fetch status' });
    } catch (e) {
      setBillingStatus({ error: e.message || 'Network error' });
    }
  };

  const handleUpdateAdminShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/shop`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(adminShop)
      });
      if (res.ok) {
        addToast("Shop Details Saved", "Branding, credentials and API integrations updated.", "success");
        loadAdminShop();
        fetchShops();
      }
    } catch (e) {}
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      addToast("Error", "Please enter a recipient email.", "danger");
      return;
    }
    setSendingTestEmail(true);
    try {
      const payload = {
        recipient: testRecipient,
        smtp_host: adminShop.smtp_host,
        smtp_port: adminShop.smtp_port,
        smtp_user: adminShop.smtp_user,
        smtp_password: adminShop.smtp_password,
        smtp_use_tls: !!adminShop.smtp_use_tls,
        smtp_sender_name: adminShop.smtp_sender_name,
        template_type: testTemplateType,
        email_templates: adminShop.email_templates
      };
      const res = await fetch(`${API_BASE}/admin/shop/test-smtp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Test Email Sent", data.message || "Test email sent successfully!", "success");
      } else {
        addToast("SMTP Test Failed", data.error || "Failed to send test email.", "danger");
      }
    } catch (err) {
      addToast("SMTP Error", "An error occurred while testing SMTP.", "danger");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleTemplateChange = (field, value) => {
    setAdminShop(prev => {
      const templates = { ...prev.email_templates };
      templates[selectedTemplateKey] = {
        ...templates[selectedTemplateKey],
        [field]: value
      };
      return { ...prev, email_templates: templates };
    });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail) return;
    setRequestingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/user/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("OTP Sent", "OTP code sent to your email.", "success");
        setOtpLoginStep('verify');
      } else {
        addToast("OTP Request Failed", data.error || "Failed to request OTP.", "danger");
      }
    } catch (err) {
      addToast("Error", "Failed to send OTP request.", "danger");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtpLogin = async (e) => {
    e.preventDefault();
    if (!otpEmail || !otpCode) return;
    try {
      const res = await fetch(`${API_BASE}/user/otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp_code: otpCode, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        setRole(data.user.role || 'user');
        localStorage.setItem("userToken", data.token);
        setShowLoginModal(false);
        setOtpLoginStep('none');
        setOtpEmail('');
        setOtpCode('');
        addToast("Logged In", data.message || "Successfully logged in via OTP!", "success");
      } else {
        addToast("Verification Failed", data.error || "Invalid OTP code.", "danger");
      }
    } catch (err) {
      addToast("Error", "OTP Verification failed.", "danger");
    }
  };

  const handleRequestForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const res = await fetch(`${API_BASE}/user/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Code Sent", "If the email exists, a password reset code was sent.", "success");
        setForgotPasswordStep('verify');
      } else {
        addToast("Error", data.error || "Failed to request reset.", "danger");
      }
    } catch (err) {
      addToast("Error", "An error occurred.", "danger");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotResetCode || !forgotNewPassword) return;
    try {
      const res = await fetch(`${API_BASE}/user/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, reset_token: forgotResetCode, new_password: forgotNewPassword, shop_id: activeShopId })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Password Reset", "Your password has been reset successfully.", "success");
        setForgotPasswordStep('none');
        setForgotEmail('');
        setForgotResetCode('');
        setForgotNewPassword('');
      } else {
        addToast("Reset Failed", data.error || "Invalid or expired reset code.", "danger");
      }
    } catch (err) {
      addToast("Error", "Password reset failed.", "danger");
    }
  };

  const loadAdminCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/categories`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminCategories(data);
    } catch (e) {}
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!categoryForm.id;
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/admin/categories/${categoryForm.id}` : '/admin/categories';

      const payload = {
        ...categoryForm,
        return_window_days: categoryForm.return_window_days !== "" ? parseInt(categoryForm.return_window_days) : null,
        shipping_charge: categoryForm.shipping_charge !== "" ? parseFloat(categoryForm.shipping_charge) : 0.0
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addToast("Category Saved", `Category '${categoryForm.name}' updated.`, "success");
        setCategoryForm({ id: null, name: "", description: "", image_url: "", return_window_days: "", shipping_charge: "" });
        loadAdminCategories();
      }
    } catch (e) {}
  };

  const handleDeleteCategory = async (catId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${catId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Deleted", "Category deleted successfully.", "info");
        loadAdminCategories();
      }
    } catch (e) {}
  };

  const loadAdminCollections = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/collections`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminCollections(data);
    } catch (e) {}
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!collectionForm.id;
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/admin/collections/${collectionForm.id}` : '/admin/collections';

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(collectionForm)
      });
      if (res.ok) {
        addToast("Collection Saved", `Collection '${collectionForm.name}' saved successfully.`, "success");
        setCollectionForm({ id: null, name: "", category_ids: [], separate_categories_mobile: false, show_category_banner: true });
        loadAdminCollections();
        fetchCollections();
      } else {
        const err = await res.json();
        addToast("Collection Error", err.error, "danger");
      }
    } catch (e) {}
  };

  const handleDeleteCollection = async (colId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/collections/${colId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Deleted", "Collection deleted successfully.", "info");
        loadAdminCollections();
        fetchCollections();
      }
    } catch (e) {}
  };

  const loadAdminProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/products`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminProducts(data);
    } catch (e) {}
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!productForm.id;
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/admin/products/${productForm.id}` : '/admin/products';

      // Clean images JSON list
      const payload = { 
        ...productForm, 
        price: parseFloat(productForm.price),
        original_price: productForm.original_price ? parseFloat(productForm.original_price) : parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        alert_threshold: parseInt(productForm.alert_threshold),
        promo_discount: productForm.promo_discount ? parseFloat(productForm.promo_discount) : 0,
        bulk_sale_price: productForm.bulk_sale_price ? parseFloat(productForm.bulk_sale_price) : null,
        min_quantity: productForm.min_quantity ? parseInt(productForm.min_quantity) : null,
        images: productForm.images.filter(img => img.trim() !== ""),
        return_window_days: productForm.return_window_days !== "" ? parseInt(productForm.return_window_days) : null
      };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addToast("Catalog Updated", `Product saved.`, "success");
        setProductForm({ id: null, name: "", description: "", price: "", original_price: "", stock: "", alert_threshold: 5, images: [""], category_id: "", promo_code: "", promo_discount: "", bulk_sale_price: "", min_quantity: "", customization_enabled: false, barcode: "", sku_code: "", hsc_code: "", return_window_days: "" });
        loadAdminProducts();
      } else {
        const err = await res.json();
        addToast("Error", err.error, "danger");
      }
    } catch (e) {}
  };

  const handleDeleteProduct = async (prodId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/products/${prodId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Deleted", "Product removed.", "info");
        loadAdminProducts();
      } else {
        const err = await res.json();
        addToast("Error", err.error || "Failed to delete product.", "danger");
      }
    } catch (e) {
      addToast("Error", "Network connection issue.", "danger");
    }
  };

  const handleDownloadProductsReport = () => {
    const headers = [
      "Product ID",
      "Product Name",
      "Category",
      "Price (INR)",
      "Original Price (INR)",
      "Stock",
      "Alert Threshold",
      "Promo Code",
      "Promo Discount (INR)",
      "Bulk Price (INR)",
      "Min Bulk Qty"
    ];
    
    const rows = filteredAdminProducts.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.category_name || '').replace(/"/g, '""')}"`,
      p.price,
      p.original_price,
      p.stock,
      p.alert_threshold,
      p.promo_code || "None",
      p.promo_discount || 0,
      p.bulk_sale_price || "",
      p.min_quantity || ""
    ]);
    
    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `store_products_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadAdminOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminOrders(data);
    } catch (e) {}
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'Dispatched') {
        payload.tracking_info = `Dispatched via Hub Courier. Track ID: ${Math.floor(Math.random() * 90000) + 10000}`;
      }
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addToast("Status Transition", `Order status set to '${newStatus}'.`, "success");
        loadAdminOrders();
      }
    } catch (e) {}
  };

  const handleBookDtdcShipping = async (orderId, weight = 0.5) => {
    try {
      setBookingShippingId(orderId);
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/book-shipping`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ weight_kg: weight })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const parts = data.order.tracking_info ? data.order.tracking_info.split('AWB:') : [];
        const awb = parts.length > 0 ? parts[parts.length - 1].trim() : '';
        addToast("Shipment Booked", `DTDC shipment booked. AWB: ${awb}`, "success");
        loadAdminOrders();
        if (data.order.shipping_label_url) {
          window.open(data.order.shipping_label_url, '_blank');
        }
      } else {
        addToast("Booking Failed", data.error || "Could not book DTDC shipment.", "danger");
      }
    } catch (e) {
      addToast("Error", "Network error while booking shipment.", "danger");
    } finally {
      setBookingShippingId(null);
    }
  };

  const handleResolveReturn = async (orderId, decision) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/return`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        addToast("Return Finalized", `Customer return request was ${decision}.`, "info");
        loadAdminOrders();
      }
    } catch (e) {}
  };

  const handleShowCustomerHistory = (userId, userName) => {
    const customerOrders = adminOrders.filter(o => o.user_id === userId);
    setSelectedCustomerHistory({
      userId,
      userName,
      orders: customerOrders
    });
  };

  const exportOrdersCSV = () => {
    const headers = [
      "Order ID", 
      "Customer Name", 
      "Order Date", 
      "Shipping Address", 
      "Billing Phone",
      "Gross Total (INR)", 
      "Delivery Charge (INR)",
      "Delivery GST (INR)",
      "Net Goods (INR)",
      "Goods GST (INR)",
      "Total GST Collected (INR)",
      "Payment Method", 
      "Ship Status", 
      "Items Ordered"
    ];
    
    const rows = filteredAdminOrders.map(o => {
      const itemsStr = o.items ? o.items.map(item => 
        `${item.product_name} (ID: ${item.product_id}, Qty: ${item.quantity}, Cat: ${item.category_name || 'Uncategorized'}, Price: INR ${item.price})`
      ).join(" | ") : "";
      
      const orderDelivery = o.shipping_charge || 0;
      const orderDeliveryGst = o.shipping_gst || 0;
      const orderTotalGst = o.gst_amount || 0;
      const orderGoodsGst = orderTotalGst - orderDeliveryGst;
      const orderNetGoods = o.final_amount - orderDelivery - orderGoodsGst;

      return [
        `#${o.id}`,
        `"${(o.user_name || '').replace(/"/g, '""')}"`,
        `"${o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}"`,
        `"${(o.shipping_address || '').replace(/"/g, '""')}"`,
        `"${(o.billing_phone || '').replace(/"/g, '""')}"`,
        o.final_amount,
        orderDelivery,
        orderDeliveryGst,
        orderNetGoods.toFixed(2),
        orderGoodsGst.toFixed(2),
        orderTotalGst,
        `"${(o.payment_method || '').replace(/"/g, '""')}"`,
        `"${(o.status || '').replace(/"/g, '""')}"`,
        `"${itemsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `store_orders_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadAdminInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/inventory`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminInventory(data);
    } catch (e) {}
  };

  const loadAdminRevenue = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/revenue-report`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminRevenue(data);
    } catch (e) {}
  };

  const loadAdminPopupAds = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/popup-ads`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminPopupAds(data);
    } catch (e) {}
  };

  const handleSavePopupAd = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!adForm.id;
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/admin/popup-ads/${adForm.id}` : '/admin/popup-ads';

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(adForm)
      });
      if (res.ok) {
        addToast("Banner Saved", "Campaign status successfully updated.", "success");
        setAdForm({ id: null, title: "", image_url: "", target_url: "", show_before_login: true, show_after_login: true, is_active: true });
        loadAdminPopupAds();
      }
    } catch (e) {}
  };

  const handleDeletePopupAd = async (adId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/popup-ads/${adId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Deleted", "Ad banner removed.", "info");
        loadAdminPopupAds();
      }
    } catch (e) {}
  };

  const loadAdminCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/coupons`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminCoupons(data);
    } catch (e) {}
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!couponForm.id;
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = isEdit ? `/admin/coupons/${couponForm.id}` : '/admin/coupons';

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({ 
          ...couponForm, 
          discount_percentage: parseFloat(couponForm.discount_percentage),
          max_discount: parseFloat(couponForm.max_discount),
          min_purchase: parseFloat(couponForm.min_purchase)
        })
      });
      if (res.ok) {
        addToast("Discount Code Created", `Coupon '${couponForm.code}' is now live.`, "success");
        setCouponForm({ id: null, code: "", discount_percentage: "", max_discount: 1000, min_purchase: 0, is_active: true });
        loadAdminCoupons();
      } else {
        const err = await res.json();
        addToast("Coupon Error", err.error, "danger");
      }
    } catch (e) {}
  };

  const handleDeleteCoupon = async (cpId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${cpId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Deleted", "Discount code deleted.", "info");
        loadAdminCoupons();
      }
    } catch (e) {}
  };

  const loadAdminHelpTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/help-tickets`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminHelpTickets(data);
    } catch (e) {}
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/help-tickets`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(ticketReplyForm)
      });
      if (res.ok) {
        addToast("Reply Transmitted", "Help center ticket closed successfully.", "success");
        setTicketReplyForm({ ticket_id: "", reply: "" });
        loadAdminHelpTickets();
      }
    } catch (e) {}
  };

  const loadAdminLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/logs`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminLogs(data);
    } catch (e) {}
  };

  const loadAdminSmsLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sms-whatsapp-logs`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminSmsLogs(data);
    } catch (e) {}
  };

  const handleDispatchCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/sms-whatsapp-logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(messagingForm)
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Dispatched Campaign", data.message, "success");
        setMessagingForm({ platform: "SMS", recipient: "All Customers", message: "" });
        loadAdminSmsLogs();
      }
    } catch (e) {}
  };

  const loadGstReport = async (dateVal = gstFilterDate, monthVal = gstFilterMonth, yearVal = gstFilterYear) => {
    try {
      const queryParams = [];
      if (dateVal) queryParams.push(`date=${encodeURIComponent(dateVal)}`);
      if (monthVal) queryParams.push(`month=${encodeURIComponent(monthVal)}`);
      if (yearVal) queryParams.push(`year=${encodeURIComponent(yearVal)}`);
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await fetch(`${API_BASE}/admin/gst-report${queryString}`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setGstReport(data);
    } catch (e) {}
  };

  const clearGstFilters = () => {
    setGstFilterDate("");
    setGstFilterMonth("");
    setGstFilterYear("");
    loadGstReport("", "", "");
  };

  const exportGstExcelReport = async () => {
    try {
      const queryParams = [];
      if (gstFilterDate) queryParams.push(`date=${encodeURIComponent(gstFilterDate)}`);
      if (gstFilterMonth) queryParams.push(`month=${encodeURIComponent(gstFilterMonth)}`);
      if (gstFilterYear) queryParams.push(`year=${encodeURIComponent(gstFilterYear)}`);
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      
      const res = await fetch(`${API_BASE}/admin/gst-report/export${queryString}`, {
        headers: getHeaders()
      });
      
      if (!res.ok) {
        throw new Error('Failed to generate export file');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename = 'GST_Tax_Report';
      if (gstFilterDate) {
        filename += `_${gstFilterDate}`;
      } else if (gstFilterMonth || gstFilterYear) {
        if (gstFilterMonth) {
          const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const mName = months[parseInt(gstFilterMonth)] || `Month_${gstFilterMonth}`;
          filename += `_${mName}`;
        }
        if (gstFilterYear) filename += `_${gstFilterYear}`;
      } else {
        filename += '_AllTime';
      }
      filename += '.xlsx';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast("Export Successful", "GST Tax Report downloaded as Excel workbook", "success");
    } catch (err) {
      addToast("Export Failed", err.message, "danger");
    }
  };

  const loadAdminCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/customers`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminCustomers(data);
    } catch (e) {}
  };

  const loadAdminCustomizations = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/customizations`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setAdminCustomizations(data);
    } catch (e) {}
  };

  const handleSendQuote = async (custId, price) => {
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      addToast("Invalid Price", "Please enter a valid price greater than zero.", "warning");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/customizations/${custId}/quote`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ quoted_price: parseFloat(price) })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Quote Sent", "Price quote sent successfully to customer.", "success");
        loadAdminCustomizations();
      } else {
        addToast("Error", data.error || "Failed to send price quote.", "danger");
      }
    } catch (err) {
      addToast("Error", err.message, "danger");
    }
  };



  // SUPER ADMIN ACTION ROUTINES
  useEffect(() => {
    if (role === 'super_admin' && currentView === 'super_admin_dashboard') {
      if (activePanel === 'shop_creation') loadSuperShops();
      if (activePanel === 'admin_creation') {
        loadSuperShops();
        loadSuperAdmins();
      }
      if (activePanel === 'audit_logs') {
        loadSuperShops();
        loadSuperLogs();
      }
      if (activePanel === 'orders') {
        loadSuperShops();
        loadSuperOrders();
      }
      if (activePanel === 'customers') {
        loadSuperCustomers();
      }
    }
  }, [role, currentView, activePanel]);

  const loadSuperShops = async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/shops`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setSuperShops(data);
    } catch (e) {}
  };

  const loadSuperAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setSuperAdmins(data);
    } catch (e) {}
  };

  const loadSuperLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/logs`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setSuperLogs(data);
    } catch (e) {}
  };

  const loadSuperOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/orders`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setSuperOrders(data);
    } catch (e) {}
  };

  const loadSuperCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/customers`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setSuperCustomers(data);
    } catch (e) {}
  };

  const handleDeleteCustomer = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this customer? This action will delete all their orders, cart items, wishlist, reviews, and related information.")) return;
    try {
      const res = await fetch(`${API_BASE}/super-admin/customers/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Customer Deleted", "Customer account deleted successfully.", "success");
        loadSuperCustomers();
      } else {
        const data = await res.json();
        addToast("Delete Failed", data.error || "Could not delete customer.", "danger");
      }
    } catch (e) {
      addToast("Delete Failed", "Server error while deleting customer.", "danger");
    }
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/super-admin/shops`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(shopForm)
      });
      if (res.ok) {
        addToast("Shop Activated", `Shop '${shopForm.name}' provisioned and set up successfully.`, "success");
        setShopForm({ id: null, name: "", logo_url: "", contact_email: "", contact_phone: "", privacy_policy: "", address: "", sms_api_key: "", whatsapp_api_key: "", razorpay_key_id: "", razorpay_key_secret: "", super_coin_enabled: true, super_coin_ratio: 10, gst_percentage: 18.0, gst_inclusive: false });
        loadSuperShops();
      }
    } catch (e) {}
  };

  const handleUpdateShopConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/super-admin/shops/${shopForm.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(shopForm)
      });
      if (res.ok) {
        addToast("Global Settings Overwritten", "Shop details updated.", "success");
        setShopForm({ id: null, name: "", logo_url: "", contact_email: "", contact_phone: "", privacy_policy: "", address: "", sms_api_key: "", whatsapp_api_key: "", razorpay_key_id: "", razorpay_key_secret: "", super_coin_enabled: true, super_coin_ratio: 10, gst_percentage: 18.0, gst_inclusive: false });
        loadSuperShops();
      }
    } catch (e) {}
  };

  const handleDeleteShop = async (shopId) => {
    try {
      const res = await fetch(`${API_BASE}/super-admin/shops/${shopId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Wiped Shop", "Shop completely removed from ecosystem.", "info");
        loadSuperShops();
      }
    } catch (e) {}
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!newAdminForm.id;
      const url = isEdit 
        ? `${API_BASE}/super-admin/admins/${newAdminForm.id}` 
        : `${API_BASE}/super-admin/admins`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(newAdminForm)
      });
      const data = await res.json();
      if (res.ok) {
        addToast(isEdit ? "Admin Updated" : "Admin Created", isEdit ? `Admin details updated for '${newAdminForm.username}'.` : `Authorized login set up for '${newAdminForm.username}'.`, "success");
        setNewAdminForm({ id: null, username: "", password: "", email: "", name: "", shop_id: "" });
        loadSuperAdmins();
      } else {
        addToast(isEdit ? "Update Error" : "Creation Error", data.error, "danger");
      }
    } catch (e) {}
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to delete this administrator?")) return;
    try {
      const res = await fetch(`${API_BASE}/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        addToast("Admin Deleted", "Administrator removed successfully.", "info");
        loadSuperAdmins();
      } else {
        const data = await res.json();
        addToast("Delete Error", data.error || "Failed to delete administrator.", "danger");
      }
    } catch (e) {
      addToast("Delete Error", "An error occurred.", "danger");
    }
  };

  // Checkout Calculations
  const checkoutSubtotal = activeCustomizationCheckout
    ? (activeCustomizationCheckout.quoted_price * activeCustomizationCheckout.quantity)
    : cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const checkoutSuperCoinDiscount = !activeCustomizationCheckout && checkoutData.use_super_coins ? checkoutSubtotal * 0.15 : 0;
  const checkoutCouponDiscount = !activeCustomizationCheckout && checkoutData.coupon_code ? checkoutSubtotal * 0.05 : 0;
  const checkoutDiscountedAmount = Math.max(0, checkoutSubtotal - checkoutSuperCoinDiscount - checkoutCouponDiscount);
  const checkoutGstRate = currentShop?.gst_percentage ?? 18.0;
  const checkoutGstInclusive = currentShop?.gst_inclusive ?? false;
  const checkoutGstAmount = checkoutGstInclusive 
    ? (checkoutDiscountedAmount * (checkoutGstRate / 100.0)) / (1 + (checkoutGstRate / 100.0)) 
    : checkoutDiscountedAmount * (checkoutGstRate / 100.0);

  const checkoutShippingCharge = useMemo(() => {
    if (!currentShop?.shipping_enabled) return 0;
    if (currentShop.shipping_charges_type === 'flat') {
      return currentShop.shipping_charges_flat ?? 0;
    }
    if (currentShop.shipping_charges_type === 'section') {
      if (activeCustomizationCheckout) {
        const categoryId = activeCustomizationCheckout.product?.category_id;
        if (categoryId) {
          const cat = categories.find(c => c.id === categoryId);
          return cat?.shipping_charge ?? 0;
        }
        return 0;
      }
      const uniqueCategoryIds = Array.from(new Set(cart.map(item => item.product.category_id).filter(id => id !== null && id !== undefined)));
      let sumCharges = 0;
      uniqueCategoryIds.forEach(catId => {
        const cat = categories.find(c => c.id === catId);
        if (cat && cat.shipping_charge) {
          sumCharges += cat.shipping_charge;
        }
      });
      return sumCharges;
    }
    return 0;
  }, [currentShop, activeCustomizationCheckout, cart, categories]);

  const checkoutFinalAmount = (checkoutGstInclusive 
    ? checkoutDiscountedAmount 
    : checkoutDiscountedAmount + checkoutGstAmount) + checkoutShippingCharge;

  return (
    <div className="app-container">
      {/* Dynamic Toast Alerts Container */}
      <div style={{ 
        position: 'fixed', 
        top: isMobile ? '12px' : 'auto', 
        bottom: isMobile ? 'auto' : '24px', 
        left: isMobile ? '12px' : 'auto',
        right: isMobile ? '12px' : '24px', 
        zIndex: 10500, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        maxWidth: isMobile ? 'none' : '380px', 
        width: isMobile ? 'calc(100% - 24px)' : '90%',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="glass-panel animate-fade-in" 
            style={{ 
              pointerEvents: 'auto', 
              padding: '14px 18px', 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center', 
              background: t.type === 'danger' 
                ? 'rgba(255, 239, 241, 0.98)' 
                : t.type === 'success' 
                  ? 'rgba(240, 253, 244, 0.98)' 
                  : t.type === 'warning'
                    ? 'rgba(255, 251, 235, 0.98)'
                    : 'rgba(245, 243, 255, 0.98)', 
              borderColor: t.type === 'danger' 
                ? '#fca5a5' 
                : t.type === 'success' 
                  ? '#86efac' 
                  : t.type === 'warning'
                    ? '#fde047'
                    : '#d8b4fe',
              borderRadius: '16px',
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: '0 10px 30px rgba(122, 78, 165, 0.12)',
              backdropFilter: 'blur(10px)',
              width: '100%'
            }}
          >
            {t.type === 'danger' && <ShieldAlert style={{ color: '#ef4444', flexShrink: 0 }} size={20} />}
            {t.type === 'success' && <Check style={{ color: '#10b981', flexShrink: 0 }} size={20} />}
            {t.type === 'warning' && <AlertCircle style={{ color: '#f59e0b', flexShrink: 0 }} size={20} />}
            {(t.type === 'info' || !t.type) && <Bell style={{ color: '#7a4ea5', flexShrink: 0 }} size={20} />}
            <div style={{ flex: 1 }}>
              <h5 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#2b0b57', margin: '0 0 2px 0' }}>{t.title}</h5>
              <p style={{ fontSize: '0.78rem', color: '#555555', margin: 0, lineHeight: 1.3 }}>{t.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ background: '#f5edff', border: 'none', color: '#7a4ea5', cursor: 'pointer', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* RENDER ACTIVE POPUP AD IF GUEST OR USER OPENS SHOP */}
      {popupAd && (
        <div className="ad-modal-backdrop" onClick={() => setPopupAd(null)}>
          <div className="ad-modal-body" onClick={e => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={() => setPopupAd(null)}>
              <X size={18} />
            </button>
            <img className="ad-modal-img" src={popupAd.image_url || null} alt={popupAd.title} />
            <div className="ad-modal-info">
              <span className="badge badge-info" style={{ width: 'fit-content', margin: '0 auto' }}>Special Event Campaign</span>
              <h3 style={{ fontWeight: 800, fontSize: '1.4rem' }}>{popupAd.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Visit this shop page to redeem amazing discount and promo coupon codes right now.</p>
              {popupAd.target_url && (
                <button onClick={() => {
                  setPopupAd(null);
                  if (popupAd.target_url.includes('/shop/')) {
                    const shopId = popupAd.target_url.split('/').pop();
                    setActiveShopId(parseInt(shopId));
                  }
                }} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Explore Event Now <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (() => {
        const activeShop = shops.find(s => s.id === activeShopId);
        const contactEmail = activeShop ? activeShop.contact_email : "support@nobaraa.com";
        const contactPhone = activeShop ? activeShop.contact_phone : "+91 94444 33333";
        const shopAddress = activeShop ? activeShop.address : "Chennai, Tamil Nadu, India";
        return (
          <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowContactModal(false)}>
            <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
              background: '#ffffff', 
              borderRadius: '24px', 
              width: '720px', 
              maxWidth: '90%',
              maxHeight: '85vh',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
              position: 'relative',
              fontFamily: "'Jost', sans-serif",
              overflow: 'hidden'
            }}>
              <button onClick={() => setShowContactModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
                <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>Contact Us</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get in Touch with our Boutique Experts</p>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  We are here to assist you with order tracking, custom sizing recommendations, or product questions. Please reach out to our team via the details below:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', background: '#fcfbfe', padding: '16px', borderRadius: '16px', border: '1px solid #f3ecf9' }}>
                    <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#2b0b57' }}>Email Support</h4>
                      <a href={`mailto:${contactEmail}`} style={{ color: '#7a4ea5', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>{contactEmail}</a>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>We respond within 24 hours</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', background: '#fcfbfe', padding: '16px', borderRadius: '16px', border: '1px solid #f3ecf9' }}>
                    <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#2b0b57' }}>Phone & WhatsApp</h4>
                      <a href={`tel:${contactPhone}`} style={{ color: '#7a4ea5', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>{contactPhone}</a>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mon - Sat: 9:00 AM - 7:00 PM</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', background: '#fcfbfe', padding: '16px', borderRadius: '16px', border: '1px solid #f3ecf9' }}>
                    <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Home size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#2b0b57' }}>Boutique Address</h4>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#333', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                        {shopAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={() => setShowContactModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Understood</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ABOUT NOBARAA MODAL */}
      {showAboutModal && (() => {
        const activeShop = shops.find(s => s.id === activeShopId);
        const aboutContent = (activeShop && activeShop.privacy_policy) 
          ? activeShop.privacy_policy 
          : "Nobaraa is a premium designer boutique specializing in bespoke customization and handcrafted ethnic luxury sarees, designed with timeless precision and unmatched elegance.";
        return (
          <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowAboutModal(false)}>
            <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
              background: '#ffffff', 
              borderRadius: '24px', 
              width: '720px', 
              maxWidth: '90%',
              maxHeight: '85vh',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
              position: 'relative',
              fontFamily: "'Jost', sans-serif",
              overflow: 'hidden'
            }}>
              <button onClick={() => setShowAboutModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
                <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                  <Award size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>About Nobaraa</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Designer Boutique & Heritage Handloom</p>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
                <div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '1.05rem', color: '#333' }}>
                    {aboutContent}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={() => setShowAboutModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TERMS OF SERVICE MODAL */}
      {showTermsModal && (
        <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowTermsModal(false)}>
          <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            width: '720px', 
            maxWidth: '90%',
            maxHeight: '85vh',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
            position: 'relative',
            fontFamily: "'Jost', sans-serif",
            overflow: 'hidden'
          }}>
            <button onClick={() => setShowTermsModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
              <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <FileText size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>Terms of Service</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Last updated: May 30, 2026</p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>1. Agreement to Terms</h4>
                <p style={{ margin: 0 }}>
                  By accessing and purchasing from Nobaraa Boutique, you unconditionally agree to follow and be bound by these Terms of Service, all applicable laws, and regulations.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>2. Accounts and Security</h4>
                <p style={{ margin: 0 }}>
                  When you register a customer profile on our system, you are responsible for maintaining the privacy of your credentials. You agree to assume full accountability for all actions associated with your profile credentials.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>3. Bespoke Orders and Tailoring</h4>
                <p style={{ margin: 0 }}>
                  For customization orders:
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                  <li>Customers must ensure accurate measurements are provided in the sizing fields.</li>
                  <li>We are not responsible for fitting issues resulting from incorrect measurement inputs.</li>
                  <li>As customized designs are custom tailored, they are strictly non-cancelable after 2 hours of payment confirmation.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>4. Billing, Pricing & GST</h4>
                <p style={{ margin: 0 }}>
                  All prices listed are inclusive of tax where noted. Standard GST and local delivery tariffs are computed automatically during cart checkout. We reserve the right to alter pricing and bulk order minimums without prior notification.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>5. Limitation of Liability</h4>
                <p style={{ margin: 0 }}>
                  Nobaraa Boutique, its shops, and administrators shall not be liable for any indirect, incidental, or punitive damages arising from product misuse, delivery delays due to national emergencies, or database connection interruptions.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowTermsModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Understood</button>
            </div>
          </div>
        </div>
      )}

      {/* SHIPPING POLICY MODAL */}
      {showShippingModal && (
        <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowShippingModal(false)}>
          <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            width: '720px', 
            maxWidth: '90%',
            maxHeight: '85vh',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
            position: 'relative',
            fontFamily: "'Jost', sans-serif",
            overflow: 'hidden'
          }}>
            <button onClick={() => setShowShippingModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
              <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <Truck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>Shipping Policy</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Last updated: May 30, 2026</p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>1. Delivery Timelines</h4>
                <p style={{ margin: 0 }}>
                  We strive to process and dispatch all orders promptly:
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                  <li><strong>Standard Orders</strong>: Dispatched within 24-48 hours. Delivery takes 3-5 business days depending on location.</li>
                  <li><strong>Bespoke Customized Orders</strong>: Require an additional 5-7 business days for custom design, tailoring, and quality finishing before dispatch.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>2. Shipping Charges</h4>
                <p style={{ margin: 0 }}>
                  Shipping fees are calculated dynamically based on total package weight, destination distance, and shipping speed (Standard vs Express). Any shipping promotions or free shipping thresholds will be automatically applied at checkout.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>3. Courier Partners & Tracking</h4>
                <p style={{ margin: 0 }}>
                  We deliver via trusted national shipping carriers (e.g. DTDC, Blue Dart, Delhivery). Once your order is dispatched, a tracking reference ID and link will be shared via email and updated in your order history dashboard.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>4. Delivery Address Adjustments</h4>
                <p style={{ margin: 0 }}>
                  Address modifications can only be requested prior to dispatch. Once the parcel leaves our dispatch hub, address routing updates cannot be guaranteed.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>5. Damaged Shipments</h4>
                <p style={{ margin: 0 }}>
                  If you receive a package that shows visible tampering or physical damage, please refuse the delivery and immediately report the incident to our support team with photographic proof.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowShippingModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Understood</button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowPrivacyModal(false)}>
          <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            width: '720px', 
            maxWidth: '90%',
            maxHeight: '85vh',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
            position: 'relative',
            fontFamily: "'Jost', sans-serif",
            overflow: 'hidden'
          }}>
            <button onClick={() => setShowPrivacyModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
              <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>Privacy Policy</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Last updated: May 30, 2026</p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>1. Information We Collect</h4>
                <p style={{ margin: 0 }}>
                  We collect personal details to facilitate your boutique experience, including your name, email address, phone number, shipping address, and customization choices (colors, sizing, notes).
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>2. How We Use Your Data</h4>
                <p style={{ margin: 0 }}>
                  Your details are utilized to process and ship your orders, track boutique loyalty points (SuperCoins), personalize home screens, communicate delivery updates, and tailor custom garments.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>3. Secure Payments</h4>
                <p style={{ margin: 0 }}>
                  All payment transactions are handled through secure gateways. We do not store credit card credentials, bank account passwords, or delicate financial details directly on our servers.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>4. Data Protection</h4>
                <p style={{ margin: 0 }}>
                  We implement commercial-grade encryption and access controls to secure customer databases and order tables against unauthorized leakages, edits, or theft.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>5. Cookies and Analytics</h4>
                <p style={{ margin: 0 }}>
                  Our site uses standard tracking tokens to preserve login sessions, remember recently viewed products, and store customization carts in local database states.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowPrivacyModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Understood</button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN & REFUND POLICY MODAL */}
      {showPolicyModal && (
        <div className="ad-modal-backdrop" style={{ zIndex: 12000, backgroundColor: 'rgba(43, 11, 87, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowPolicyModal(false)}>
          <div className="glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            width: '720px', 
            maxWidth: '90%',
            maxHeight: '85vh',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(122, 78, 165, 0.2)',
            position: 'relative',
            fontFamily: "'Jost', sans-serif",
            overflow: 'hidden'
          }}>
            <button onClick={() => setShowPolicyModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>
              <div style={{ background: '#f5edff', color: '#7a4ea5', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <RotateCcw size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#2b0b57', fontWeight: 800, margin: 0, fontFamily: 'var(--font-serif)' }}>Return & Refund Policy</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Last updated: May 30, 2026</p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.6, color: '#444' }}>
              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>1. Return Eligibility</h4>
                <p style={{ margin: 0 }}>
                  We accept return requests on eligible products and categories within their designated return window duration. The return window is counted from the date and time of order delivery (marked as "Customer Received" status).
                </p>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', listStyleType: 'disc' }}>
                  <li><strong>Shop-level Default</strong>: Items default to a 7-day return window unless specified otherwise by the shop settings.</li>
                  <li><strong>Category-level Override</strong>: Overrides shop defaults according to specialized category rules.</li>
                  <li><strong>Product-specific Setting</strong>: Product-level return window settings take the highest precedence.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>2. Non-Returnable & Customized Orders</h4>
                <p style={{ margin: 0 }}>
                  Any orders placed via the <strong>Bespoke Customization</strong> suite (personalized size specifications, specific custom color palettes, or customized tailormade styles) are strictly <strong>non-returnable and non-refundable</strong> as they are uniquely produced to your personal requirements.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>3. Condition of Returned Items</h4>
                <p style={{ margin: 0 }}>
                  To be eligible for a return, your items must be unused, unwashed, in the original brand packaging with all product labels, authentication tags, and invoices intact. Items returned with signs of damage or wear will not be accepted.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>4. Refund Process</h4>
                <p style={{ margin: 0 }}>
                  Once the return shipment is received and inspected by our warehouse quality assurance team, your refund will be processed. Approved refunds are returned to your original payment method (Credit/Debit Card, UPI, Net Banking) within <strong>5-7 business days</strong>. For Cash on Delivery (COD) orders, a store credit or direct bank transfer will be issued.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#2b0b57', fontWeight: 700, margin: '0 0 8px 0', fontSize: '1.05rem' }}>5. Late or Expired Returns</h4>
                <p style={{ margin: 0 }}>
                  Return buttons are dynamically disabled once the computed return window expires. No manual exceptions can be made on orders where the return period has elapsed.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid #f0e6fc', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowPolicyModal(false)} style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}>Understood</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION POPUP MODAL (LOGIN & REGISTRATION) */}
      {showLoginModal && (
        <div className="ad-modal-backdrop" style={{ zIndex: 11000, backgroundColor: 'rgba(122, 78, 165, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setShowLoginModal(false)}>
          <div className="login-modal-container" onClick={e => e.stopPropagation()} style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            width: '980px', 
            maxWidth: '95%',
            display: 'flex',
            boxShadow: '0 30px 60px rgba(122, 78, 165, 0.15)',
            position: 'relative',
            fontFamily: "'Jost', sans-serif",
            overflow: 'hidden'
          }}>
            <button className="ad-modal-close" onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer', color: '#7a4ea5', zIndex: 100, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <X size={20} />
            </button>

            {/* LEFT SIDE (LAVENDER BOUTIQUE PANEL WITH CONVEX ARCH) */}
            <div className="login-modal-left" style={{
              background: 'linear-gradient(135deg, #f5edff 0%, #ecdffa 100%)',
              width: '44%',
              padding: '30px',
              color: '#2b0b57',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '520px'
            }}>
              {/* Convex White Arch Overlay */}
              <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-100px',
                width: '200px',
                height: '120%',
                background: '#ffffff',
                borderRadius: '50%',
                zIndex: 1
              }} />

              {/* Brand Logo & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
                <img src="/nobaraa_logo_emblem.png" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.25rem', color: '#2b0b57', letterSpacing: '0.5px', lineHeight: 1.1 }}>Nobaraa Fashion</span>
                  <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '0.8rem', color: '#7a4ea5', marginTop: '1px' }}>Style That Defines You</span>
                </div>
              </div>

              {/* Welcome Greetings */}
              <div style={{ zIndex: 2, marginTop: '20px', paddingRight: '20px' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.9rem', fontWeight: 700, color: '#2b0b57', display: 'block', lineHeight: 1.2 }}>Welcome Back</span>
                <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3.2rem', color: '#7a4ea5', marginTop: '-10px', display: 'block' }}>Beautiful! ♡</span>
                <p style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.85rem', color: '#555555', lineHeight: '1.4', marginTop: '10px', maxWidth: '280px' }}>
                  Sign in to continue shopping the latest styles and exclusive collections.
                </p>
              </div>

              {/* Saree Model Poses Mockup */}
              <div style={{ zIndex: 2, width: '100%', height: '300px', marginTop: 'auto', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', transform: 'translateX(-25px)' }}>
                <img src="/nobaraa_login_mockup.png?v=5" alt="Saree Model Poses" style={{ width: '115%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            </div>

            {/* RIGHT SIDE (SLEEK FORM PANEL) */}
            <div className="login-modal-right" style={{
              width: '56%',
              padding: '35px 50px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              color: '#111',
              zIndex: 5
            }}>
              {forgotPasswordStep !== 'none' ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#2b0b57', margin: 0 }}>Reset Password</h3>
                    <div style={{ width: '40px', height: '3px', background: '#7a4ea5', margin: '6px auto 0', borderRadius: '2px' }} />
                    <p style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>
                      {forgotPasswordStep === 'request' ? 'Request a reset code' : 'Enter reset code and new password'}
                    </p>
                  </div>

                  {forgotPasswordStep === 'request' ? (
                    <form onSubmit={handleRequestForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="email" 
                          placeholder="Email Address"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          className="nobaraa-login-input"
                          required
                        />
                      </div>

                      <button type="submit" style={{ 
                        background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontSize: '0.95rem', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)'
                      }}>
                        Send Reset Code <ChevronRight size={18} />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="email" 
                          placeholder="Email Address"
                          value={forgotEmail}
                          disabled
                          className="nobaraa-login-input"
                          style={{ opacity: 0.7 }}
                          required
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="text" 
                          placeholder="6-digit Reset Code"
                          value={forgotResetCode}
                          onChange={e => setForgotResetCode(e.target.value)}
                          className="nobaraa-login-input"
                          required
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="password" 
                          placeholder="New Password"
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                          className="nobaraa-login-input"
                          required
                        />
                      </div>

                      <button type="submit" style={{ 
                        background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontSize: '0.95rem', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)'
                      }}>
                        Reset Password <ChevronRight size={18} />
                      </button>
                    </form>
                  )}

                  <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem', color: '#666666', margin: '16px 0 0' }}>
                    Remember password? <span onClick={() => { setForgotPasswordStep('none'); setOtpLoginStep('none'); }} style={{ color: '#7a4ea5', fontWeight: 700, cursor: 'pointer' }}>Back to Login</span>
                  </p>
                </>
              ) : otpLoginStep !== 'none' ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#2b0b57', margin: 0 }}>Login with OTP</h3>
                    <div style={{ width: '40px', height: '3px', background: '#7a4ea5', margin: '6px auto 0', borderRadius: '2px' }} />
                    <p style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>
                      {otpLoginStep === 'request' ? 'Request an OTP verification code' : 'Verify the OTP sent to your email'}
                    </p>
                  </div>

                  {otpLoginStep === 'request' ? (
                    <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="email" 
                          placeholder="Email Address"
                          value={otpEmail}
                          onChange={e => setOtpEmail(e.target.value)}
                          className="nobaraa-login-input"
                          required
                        />
                      </div>

                      <button type="submit" disabled={requestingOtp} style={{ 
                        background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontSize: '0.95rem', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)',
                        opacity: requestingOtp ? 0.7 : 1
                      }}>
                        {requestingOtp ? 'Sending...' : 'Send OTP'} <ChevronRight size={18} />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtpLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="email" 
                          placeholder="Email Address"
                          value={otpEmail}
                          disabled
                          className="nobaraa-login-input"
                          style={{ opacity: 0.7 }}
                          required
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                        <input 
                          type="text" 
                          placeholder="6-digit OTP Code"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          className="nobaraa-login-input"
                          required
                        />
                      </div>

                      <button type="submit" style={{ 
                        background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontSize: '0.95rem', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)'
                      }}>
                        Verify & Login <ChevronRight size={18} />
                      </button>
                    </form>
                  )}

                  <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem', color: '#666666', margin: '16px 0 0' }}>
                    Or use password? <span onClick={() => { setForgotPasswordStep('none'); setOtpLoginStep('none'); }} style={{ color: '#7a4ea5', fontWeight: 700, cursor: 'pointer' }}>Back to Login</span>
                  </p>
                </>
              ) : !showRegister ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#2b0b57', margin: 0 }}>Hello Again!</h3>
                    <div style={{ width: '40px', height: '3px', background: '#7a4ea5', margin: '6px auto 0', borderRadius: '2px' }} />
                    <p style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>Login to your account</p>
                  </div>

                  <form onSubmit={handleUserLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input 
                        type="text" 
                        placeholder="Email or Phone Number"
                        value={loginForm.username}
                        onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                        className="nobaraa-login-input"
                        required
                      />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="nobaraa-login-input"
                        style={{ paddingRight: '44px' }}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
                      >
                        <Eye size={18} style={{ color: showPassword ? '#7a4ea5' : '#888' }} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555555', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={rememberMe} 
                          onChange={e => setRememberMe(e.target.checked)} 
                          style={{ accentColor: '#7a4ea5' }}
                        />
                        Remember Me
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span onClick={() => { setOtpLoginStep('request'); setForgotPasswordStep('none'); setShowRegister(false); }} style={{ color: '#7a4ea5', fontWeight: 600, cursor: 'pointer' }}>Login with OTP</span>
                        <span style={{ color: '#ccc' }}>|</span>
                        <span onClick={() => { setForgotPasswordStep('request'); setOtpLoginStep('none'); setShowRegister(false); }} style={{ color: '#7a4ea5', fontWeight: 600, cursor: 'pointer' }}>Forgot Password?</span>
                      </div>
                    </div>

                    <button type="submit" style={{ 
                      background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '12px', 
                      borderRadius: '10px', 
                      fontSize: '0.95rem', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)'
                    }}>
                      Login <ChevronRight size={18} />
                    </button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 12px', color: '#888888', fontSize: '0.75rem' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div ref={googleButtonRef} style={{ minHeight: '46px' }} />
                  </div>

                  <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem', color: '#666666', margin: '16px 0 0' }}>
                    Don't have an account? <span onClick={() => { setShowRegister(true); setForgotPasswordStep('none'); setOtpLoginStep('none'); }} style={{ color: '#7a4ea5', fontWeight: 700, cursor: 'pointer' }}>Sign Up</span>
                  </p>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#2b0b57', margin: 0 }}>Create Account</h3>
                    <div style={{ width: '40px', height: '3px', background: '#7a4ea5', margin: '6px auto 0', borderRadius: '2px' }} />
                    <p style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>Join our platform today</p>
                  </div>

                  <form onSubmit={handleUserRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input type="text" placeholder="Username" value={registerForm.username} onChange={e => setRegisterForm(prev => ({ ...prev, username: e.target.value }))} className="nobaraa-login-input" required />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input type="text" placeholder="Full Name" value={registerForm.name} onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))} className="nobaraa-login-input" required />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input type="email" placeholder="Email Address" value={registerForm.email} onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))} className="nobaraa-login-input" required />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input type="password" placeholder="Password" value={registerForm.password} onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))} className="nobaraa-login-input" required />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#7a4ea5' }} />
                      <input type="text" placeholder="Phone Number (Optional)" value={registerForm.contact_phone} onChange={e => setRegisterForm(prev => ({ ...prev, contact_phone: e.target.value }))} className="nobaraa-login-input" />
                    </div>
                    
                    <button type="submit" style={{ 
                       background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', 
                       color: 'white', 
                       border: 'none', 
                       padding: '12px', 
                       borderRadius: '10px', 
                       fontSize: '0.95rem', 
                       fontWeight: 600, 
                       cursor: 'pointer', 
                       transition: 'all 0.2s',
                       marginTop: '6px',
                       boxShadow: '0 8px 20px rgba(122, 78, 165, 0.2)'
                    }}>
                      Sign Up
                    </button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 12px', color: '#888888', fontSize: '0.75rem' }}>or sign up with</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div ref={googleButtonRef} style={{ minHeight: '46px' }} />
                  </div>

                  <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.88rem', color: '#666666', margin: '16px 0 0' }}>
                    Already have an account? <span onClick={() => setShowRegister(false)} style={{ color: '#7a4ea5', fontWeight: 700, cursor: 'pointer' }}>Login</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER RETURN REQUEST MODAL */}
      {activeReturnOrder && (
        <div className="ad-modal-backdrop" style={{ zIndex: 11000 }} onClick={() => {
          setActiveReturnOrder(null);
          setReturnReason("");
          setReturnImageUrl("");
        }}>
          <div className="ad-modal-body glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'white', color: '#1e293b', width: '90%', maxWidth: '650px', padding: '28px', overflowY: 'auto', maxHeight: '90vh', border: 'none', borderRadius: '16px' }}>
            <button className="ad-modal-close" onClick={() => {
              setActiveReturnOrder(null);
              setReturnReason("");
              setReturnImageUrl("");
            }} style={{ background: 'var(--accent-secondary)' }}>
              <X size={18} />
            </button>

            <h3 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '1.8rem', 
              fontWeight: 700, 
              color: '#2b0b57', 
              marginBottom: '16px',
              borderBottom: '2px solid rgba(154, 132, 200, 0.2)',
              paddingBottom: '12px'
            }}>
              File Return Request
            </h3>

            {/* Product Details Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Items to Return:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(122, 78, 165, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(122, 78, 165, 0.1)' }}>
                {activeReturnOrder.items && activeReturnOrder.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img 
                      src={item.product_image || "https://images.unsplash.com/photo-1608748010899-18f300247112?w=100"} 
                      alt={item.product_name} 
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.product_name}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ID: #{item.product_id} | Category: {item.category_name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Qty: {item.quantity}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{item.price.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Reason for Return <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                placeholder="Please describe the issue or reason for returning the product(s)..."
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', resize: 'vertical', fontSize: '0.9rem' }}
              />
            </div>

            {/* Upload Verification Image Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Upload Verification Image <span style={{ color: 'red' }}>*</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                Please upload a clear photo of the product showing the issue to verify the request.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '2px dashed rgba(122, 78, 165, 0.3)', borderRadius: '8px', background: 'rgba(122, 78, 165, 0.01)', alignItems: 'center', justifyContent: 'center' }}>
                {returnImageUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={returnImageUrl} 
                      alt="Verification preview" 
                      style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setReturnImageUrl("")} 
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--accent-danger)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input 
                      type="file" 
                      accept="image/*"
                      id="return-image-file-input"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          setUploadingReturnImage(true);
                          handleUploadFile(file, (url) => {
                            setReturnImageUrl(url);
                            setUploadingReturnImage(false);
                          });
                        }
                      }}
                    />
                    <label 
                      htmlFor="return-image-file-input" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        color: 'var(--accent-secondary)',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      {uploadingReturnImage ? (
                        <span style={{ color: 'var(--text-muted)' }}>Uploading image...</span>
                      ) : (
                        <>
                          <Plus size={24} />
                          <span>Select Verification Image</span>
                        </>
                      )}
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setActiveReturnOrder(null);
                  setReturnReason("");
                  setReturnImageUrl("");
                }} 
                className="btn-secondary" 
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button 
                disabled={!returnReason || !returnImageUrl || uploadingReturnImage}
                onClick={async () => {
                  if (returnReason && returnImageUrl) {
                    await handleRequestReturn(activeReturnOrder.id, returnReason, returnImageUrl);
                    setActiveReturnOrder(null);
                    setReturnReason("");
                    setReturnImageUrl("");
                  }
                }} 
                className="btn-danger" 
                style={{ 
                  padding: '10px 20px',
                  opacity: (!returnReason || !returnImageUrl || uploadingReturnImage) ? 0.6 : 1,
                  cursor: (!returnReason || !returnImageUrl || uploadingReturnImage) ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {expandedImage && (
        <div 
          className="ad-modal-backdrop" 
          style={{ zIndex: 12000, backgroundColor: 'rgba(0,0,0,0.85)' }} 
          onClick={() => setExpandedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90vh' }}>
            <button 
              onClick={() => setExpandedImage(null)} 
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <X size={20} /> Close
            </button>
            <img 
              src={expandedImage || null} 
              alt="Verification full preview" 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL POPUP */}
      {invoiceOrder && (
        <div className="ad-modal-backdrop" style={{ zIndex: 11000 }} onClick={() => setInvoiceOrder(null)}>
          <div className="ad-modal-body glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'white', color: '#1e293b', width: '90%', maxWidth: '650px', padding: '36px', overflowY: 'auto', maxHeight: '90vh', border: 'none' }}>
            <button className="ad-modal-close" onClick={() => setInvoiceOrder(null)} style={{ background: '#475569' }}>
              <X size={18} />
            </button>
            
            {/* Printable Frame starts */}
            <div id="print-invoice-area" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: '#0f172a' }}>TAX INVOICE</h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Order reference ID: {getDisplayOrderNumber(invoiceOrder)}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Date: {new Date(invoiceOrder.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {(() => {
                    const invoiceShopConfig = shops.find(s => s.id === invoiceOrder.shop_id);
                    return (
                      <>
                        {invoiceShopConfig?.logo_url && (
                          <img 
                            src={invoiceShopConfig.logo_url} 
                            alt={`${invoiceOrder.shop_name} Logo`} 
                            style={{ maxHeight: '50px', maxWidth: '150px', objectFit: 'contain', marginBottom: '6px' }} 
                          />
                        )}
                        <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#4f46e5', margin: 0 }}>{invoiceOrder.shop_name}</h3>
                        {invoiceShopConfig?.address ? (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'pre-line', marginTop: '4px', textAlign: 'right', maxWidth: '250px', lineHeight: '1.3' }}>
                            {invoiceShopConfig.address}
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Multi-Tenant Shop Fulfillment</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '0.9rem' }}>
                <div>
                  <h4 style={{ fontWeight: 700, color: '#475569', marginBottom: '6px' }}>BILL TO:</h4>
                  <p style={{ fontWeight: 'bold', color: '#0f172a' }}>{invoiceOrder.user_name}</p>
                  <p style={{ color: '#64748b' }}>Phone: {invoiceOrder.billing_phone}</p>
                  <div
                    title={invoiceOrder.shipping_address}
                    style={{
                      color: '#64748b',
                      maxWidth: '400px',
                      maxHeight: '3.6rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal'
                    }}
                  >
                    Shipping: {invoiceOrder.shipping_address}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PAYMENT METHOD:</h4>
                  <p style={{ fontWeight: 'bold', color: '#0f172a' }}>{invoiceOrder.payment_method}</p>
                  <p style={{ color: '#64748b' }}>Payment Status: <span style={{ fontWeight: 'bold', color: invoiceOrder.payment_status === 'Paid' ? '#10b981' : '#f59e0b' }}>{invoiceOrder.payment_status}</span></p>
                </div>
              </div>

              {/* Items listing table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ color: '#475569', padding: '10px', fontSize: '0.8rem', borderBottom: '1px solid #cbd5e1' }}>Product Details</th>
                    <th style={{ color: '#475569', padding: '10px', fontSize: '0.8rem', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Qty</th>
                    <th style={{ color: '#475569', padding: '10px', fontSize: '0.8rem', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Price</th>
                    <th style={{ color: '#475569', padding: '10px', fontSize: '0.8rem', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items && invoiceOrder.items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ color: '#0f172a', padding: '10px', fontSize: '0.85rem' }}>{item.product_name}</td>
                      <td style={{ color: '#475569', padding: '10px', fontSize: '0.85rem', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ color: '#475569', padding: '10px', fontSize: '0.85rem', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                      <td style={{ color: '#0f172a', padding: '10px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ marginLeft: 'auto', width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Total Value:</span>
                  <span>₹{invoiceOrder.total_amount.toFixed(2)}</span>
                </div>
                {invoiceOrder.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>Promo Coupon{currentShop?.super_coin_enabled !== false ? " / Coins" : ""} Discount:</span>
                    <span>-₹{invoiceOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    GST ({(() => {
                      const shopConfig = shops.find(s => s.id === invoiceOrder.shop_id);
                      if (shopConfig && shopConfig.gst_percentage !== undefined) {
                        return shopConfig.gst_percentage;
                      }
                      const discounted = invoiceOrder.total_amount - invoiceOrder.discount_amount;
                      if (discounted > 0) {
                        return Math.round((invoiceOrder.gst_amount / discounted) * 100);
                      }
                      return 18;
                    })()}%):
                  </span>
                  <span>₹{invoiceOrder.gst_amount.toFixed(2)}</span>
                </div>
                {invoiceOrder.shipping_charge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shipping & Handling:</span>
                    <span>₹{invoiceOrder.shipping_charge.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.05rem', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <span>NET AMOUNT DUE:</span>
                  <span>₹{invoiceOrder.final_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                <p>Thank you for shopping with {invoiceOrder.shop_name}! This is a computer generated invoice and requires no physical signature.</p>
              </div>
            </div>
            
            <button onClick={() => window.print()} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }}>
              Print Tax Document <FileText size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ORDER PLACED SUCCESS MODAL */}
      {orderSuccessInfo && (
        <div 
          className="ad-modal-backdrop" 
          style={{ 
            zIndex: 12000, 
            backdropFilter: 'blur(8px)', 
            background: 'rgba(43, 11, 87, 0.4)' 
          }} 
          onClick={() => {
            setOrderSuccessInfo(null);
            setCurrentView("opac");
            setActiveCategoryPage(null);
            setSelectedCategory("");
          }}
        >
          <div 
            className="glass-panel" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'rgba(245, 240, 255, 0.9)', // translucent lavender glassy
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(122, 78, 165, 0.3)',
              color: '#2b0b57', 
              width: '90%', 
              maxWidth: '480px', 
              padding: '40px 32px', 
              borderRadius: '20px', 
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(122, 78, 165, 0.25)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <style>{`
              @keyframes bounce-subtle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
            `}</style>

            {/* Close Button */}
            <button 
              onClick={() => {
                setOrderSuccessInfo(null);
                setCurrentView("opac");
                setActiveCategoryPage(null);
                setSelectedCategory("");
              }} 
              style={{ 
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(122, 78, 165, 0.1)',
                border: 'none',
                color: '#6b21a8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(122, 78, 165, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(122, 78, 165, 0.1)'}
            >
              <X size={18} />
            </button>

            {/* Premium Animated Icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
              color: '#ffffff',
              marginBottom: '8px',
              animation: 'bounce-subtle 2s infinite'
            }}>
              <Check size={36} strokeWidth={3} />
            </div>

            {/* Main Header */}
            <h2 style={{ 
              fontFamily: "var(--font-serif, 'Playfair Display', serif)", 
              fontSize: '2rem', 
              fontWeight: 800, 
              color: '#2b0b57', 
              margin: '0 auto' 
            }}>
              Your Order is placed
            </h2>

            {/* Message */}
            <p style={{ fontSize: '0.95rem', color: '#5b3a8c', lineHeight: 1.5, margin: 0 }}>
              Thank you for shopping with us! Your order has been successfully registered and is being processed.
            </p>

            {/* Order ID Box */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px dashed #7c3aed',
              borderRadius: '12px',
              padding: '12px 24px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6d28d9', display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                Order Identification ID
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4c1d95', letterSpacing: '0.5px' }}>
                {orderSuccessInfo.orderId}
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#7c3aed', fontStyle: 'italic', margin: 0 }}>
              You can track this order in your dashboard under "My Orders".
            </p>

            {/* Button */}
            <button 
              onClick={() => {
                setOrderSuccessInfo(null);
                setCurrentView("opac");
                setActiveCategoryPage(null);
                setSelectedCategory("");
              }} 
              className="btn-primary" 
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '12px', 
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '10px',
                background: '#7c3aed',
                borderColor: '#6d28d9',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
              }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL POPUP */}
      {activeTransactionOrder && (
        <div 
          className="ad-modal-backdrop" 
          style={{ zIndex: 11000 }} 
          onClick={() => setActiveTransactionOrder(null)}
        >
          <div 
            className="ad-modal-body glass-panel" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'white', 
              color: '#1e293b', 
              width: '90%', 
              maxWidth: '550px', 
              padding: '30px', 
              overflowY: 'auto', 
              maxHeight: '90vh', 
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(43, 11, 87, 0.15)'
            }}
          >
            <button 
              className="ad-modal-close" 
              onClick={() => setActiveTransactionOrder(null)} 
              style={{ background: '#7a4ea5' }}
            >
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #f3e6ff', paddingBottom: '16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', borderRadius: '50%', background: '#f0fdf4', color: '#15803d', marginBottom: '10px' }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.5rem', color: '#2b0b57', margin: '0 0 4px 0' }}>
                  Transaction Receipt
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-all', fontWeight: 600 }}>
                  Razorpay ID: {activeTransactionOrder.razorpay_payment_id}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Store / Merchant:</span>
                  <span style={{ fontWeight: 700, color: '#2b0b57' }}>{activeTransactionOrder.shop_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Order ID Ref:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{getDisplayOrderNumber(activeTransactionOrder)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Customer Name:</span>
                  <span style={{ fontWeight: 600 }}>{activeTransactionOrder.user_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Billing Contact:</span>
                  <span>{activeTransactionOrder.billing_phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Transaction Time:</span>
                  <span style={{ fontSize: '0.85rem' }}>
                    {activeTransactionOrder.created_at ? new Date(activeTransactionOrder.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Payment Mode:</span>
                  <span style={{ fontWeight: 600, color: '#4f46e5' }}>UPI (Razorpay Gateway)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Payment Status:</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 'bold' }}>
                    <Check size={14} /> CAPTURED
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2b0b57', paddingBottom: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 800, color: '#2b0b57' }}>Total Charged Amount:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>₹{activeTransactionOrder.final_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Settled Items Summary
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {activeTransactionOrder.items && activeTransactionOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', gap: '10px' }}>
                      <span style={{ color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product_name} <span style={{ color: '#64748b' }}>x{item.quantity}</span>
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e293b', flexShrink: 0 }}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                Secured by Razorpay. Settlement status is verified.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PRODUCT OVERLAY POPUP */}
      {detailProduct && (
        <div className="ad-modal-backdrop" onClick={() => setDetailProduct(null)}>
          <div className="ad-modal-body glass-panel product-detail-modal-body" onClick={e => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={() => setDetailProduct(null)}>
              <X size={18} />
            </button>
            
            {/* Left side: Images */}
            <div className="product-detail-modal-left">
              <img 
                src={detailProduct.images[activeDetailImageIndex] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} 
                alt={detailProduct.name}
                style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '4px', transition: 'all 0.3s ease' }}
              />
              
              {/* Image gallery previews */}
              {detailProduct.images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {detailProduct.images.map((img, i) => (
                    <img 
                      key={i} 
                      src={img || null} 
                      alt="" 
                      onClick={() => setActiveDetailImageIndex(i)}
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        flexShrink: 0,
                        objectFit: 'cover', 
                        borderRadius: '4px', 
                        cursor: 'pointer', 
                        border: activeDetailImageIndex === i ? '2px solid #7a4ea5' : '1px solid #eeeeee',
                        transition: 'all 0.2s ease',
                        opacity: activeDetailImageIndex === i ? 1 : 0.7
                      }}
                      onMouseEnter={(e) => { if(activeDetailImageIndex !== i) e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={(e) => { if(activeDetailImageIndex !== i) e.currentTarget.style.opacity = 0.7; }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Right side: Information */}
            <div className="product-detail-modal-right">
              <span className="badge badge-info" style={{ width: 'fit-content' }}>{detailProduct.category_name}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.6rem', color: '#222222', margin: 0 }}>{detailProduct.name}</h3>
                <button 
                  onClick={() => setSharingProduct(detailProduct)}
                  style={{ background: '#f5edff', border: 'none', color: '#7a4ea5', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                  title="Share Saree"
                  onMouseEnter={e => { e.currentTarget.style.background = '#e8d8fc'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f5edff'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Share2 size={18} />
                </button>
              </div>
              
              <div className="price-row">
                <span className="current-price" style={{ fontSize: '1.6rem' }}>₹{detailProduct.price.toFixed(2)}</span>
                {detailProduct.original_price > detailProduct.price && (
                  <span className="original-price" style={{ fontSize: '1.1rem' }}>₹{detailProduct.original_price.toFixed(2)}</span>
                )}
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{detailProduct.description}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem', background: '#fafafa', padding: '12px', borderRadius: '4px', border: '1px solid #eeeeee' }}>
                <div>Stock Status: <span style={{ color: detailProduct.stock > 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)', fontWeight: 'bold' }}>{detailProduct.stock > 0 ? `${detailProduct.stock} Available` : "Out of Stock"}</span></div>
                {detailProduct.promo_code && <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>Coupon Active: {detailProduct.promo_code}</div>}
              </div>
              
              {/* Order checkout buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    handleAddToCart(detailProduct.id);
                  }}
                  className="btn-primary" 
                  style={{ flexGrow: 1, justifyContent: 'center' }}
                  disabled={detailProduct.stock <= 0}
                >
                  <ShoppingCart size={18} /> Buy / Place Order
                </button>
                <button 
                  onClick={() => handleAddToWishlist(detailProduct.id)}
                  className="btn-secondary"
                  style={{ padding: '12px' }}
                >
                  <Heart size={18} />
                </button>
              </div>

              {detailProduct.customization_enabled && (
                <button
                  onClick={() => {
                    if (role === 'guest' || !role) {
                      setLoginRoleTab("user");
                      setShowLoginModal(true);
                      addToast("Authentication Required", "Please login to place a customization order.", "info");
                    } else {
                      setCustomizingProduct(detailProduct);
                      const palette = currentShop?.color_palette || [];
                      setSelectedCustomColor(palette.length > 0 ? palette[0] : null);
                      setCustomSizingNotes("");
                      setCustomQuantity(currentShop?.customization_min_quantity || 1);
                    }
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #7a4ea5 0%, #2b0b57 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(122, 78, 165, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginTop: '12px'
                  }}
                >
                  <Sparkles size={16} /> BESPOKE CUSTOMIZATION
                </button>
              )}

              {/* Reviews listing section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '12px' }}>Customer Reviews</h4>
                
                {role === 'user' && (
                  <form onSubmit={(e) => handleCreateReview(e, detailProduct.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                    <h5 style={{ fontWeight: 700, fontSize: '0.85rem' }}>Write a verified review</h5>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rating:</span>
                      <select 
                        value={newReview.rating} 
                        onChange={e => setNewReview(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                        style={{ width: '80px', padding: '4px' }}
                      >
                        {[5, 4, 3, 2, 1].map(x => <option key={x} value={x}>{x} Stars</option>)}
                      </select>
                    </div>
                    <textarea 
                      placeholder="Comment text feedback..." 
                      rows={2} 
                      value={newReview.comment}
                      onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      required
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'fit-content' }}>Post Review</button>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detailProduct.reviews && detailProduct.reviews.length > 0 ? (
                    detailProduct.reviews.map(r => (
                      <div key={r.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 'bold' }}>{r.user_name}</span>
                          <span style={{ color: 'var(--coin-gold)' }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.comment}</p>
                        {r.image_url && (
                          <div style={{ marginTop: '6px' }}>
                            <img 
                              src={r.image_url} 
                              alt="Review attachment" 
                              onClick={() => setActiveReviewImagePreview(r.image_url)}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                            />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No reviews yet. Be the first to leave one!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORE WEB NAVIGATION HEADER */}
      <header className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 60px', background: '#ffffff', borderBottom: '1px solid #eeeeee', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        {/* Left Side: Logo & Brand Name */}
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
          onClick={() => { setCurrentView("opac"); setActiveCategoryPage(null); setSelectedCategory(""); }}
        >
          <img src="/nobaraa_logo_emblem.png" alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.75rem', color: '#222222', letterSpacing: '0.5px' }}>
            Nobaraa Fashion
          </span>
        </div>

        {/* Center: Navigation Links */}
        <div className="desktop-nav-links" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {['Home', 'Shop', 'About Us', 'Contact'].map((item) => (
            <span 
              key={item} 
              onClick={() => {
                setCurrentView("opac");
                setActiveCategoryPage(null);
                setSelectedCategory("");
                if (item === 'Shop') {
                  const section = document.getElementById("catalog-section");
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                } else if (item === 'Contact' || item === 'About Us') {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
              }}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                fontSize: '0.95rem',
                color: item === 'Home' && !activeCategoryPage ? '#7a4ea5' : '#222222',
                cursor: 'pointer',
                position: 'relative',
                paddingBottom: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#7a4ea5'}
              onMouseLeave={(e) => {
                if (item !== 'Home' || activeCategoryPage) {
                  e.currentTarget.style.color = '#222222';
                }
              }}
            >
              {item}
              {item === 'Home' && !activeCategoryPage && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '2px',
                  background: '#7a4ea5'
                }} />
              )}
            </span>
          ))}
        </div>

        {/* Right Side: Interactive Icons Row */}
        <div className="desktop-nav-icons" style={{ display: 'flex', alignItems: 'center', gap: '24px', color: '#222222' }}>
          {/* Search Icon */}
          <div
            style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            title="Search Catalog"
            onClick={() => {
              const catalog = document.getElementById("catalog-section");
              if (catalog) {
                catalog.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                  document.getElementById("search-input")?.focus();
                }, 500);
              }
            }}
            onMouseEnter={() => setSearchHover(true)}
            onMouseLeave={() => setSearchHover(false)}
          >
            <Search
              size={22}
              style={{ transition: 'color 0.2s', color: searchHover ? '#7a4ea5' : '#222222' }}
            />
          </div>

          {/* Account Icon */}
          <div style={{ position: 'relative' }}>
            <div 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                if (role === 'guest') {
                  setLoginRoleTab("user");
                  setShowLoginModal(true);
                } else if (role === 'user') {
                  setShowProfileDropdown(!showProfileDropdown);
                } else {
                  setCurrentView(role === 'admin' ? "admin_dashboard" : "super_admin_dashboard");
                }
              }}
              title={role === 'guest' ? "Account Sign In" : "Account Menu"}
            >
              <User 
                size={22} 
                style={{ transition: 'color 0.2s', color: role !== 'guest' ? '#7a4ea5' : '#222222' }}
                onMouseEnter={e => { if (role === 'guest') e.currentTarget.style.color = '#7a4ea5'; }}
                onMouseLeave={e => { if (role === 'guest') e.currentTarget.style.color = '#222222'; }}
              />
            </div>

            {role === 'user' && showProfileDropdown && (
              <div className="glass-panel animate-fade-in" style={{
                position: 'absolute',
                top: '32px',
                right: '0',
                width: '260px',
                zIndex: 1000,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid rgba(122, 78, 165, 0.2)',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#222222',
                textAlign: 'left'
              }}>
                {/* Header profile info */}
                <div style={{ borderBottom: '1px solid #eeeeee', paddingBottom: '10px' }}>
                  <h5 style={{ fontWeight: 800, margin: 0, fontSize: '0.95rem', color: '#222222', fontFamily: "'Playfair Display', serif" }}>{user?.name || 'Kirubanithi Customer'}</h5>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#666666', fontWeight: 500 }}>Customer Wallet</p>
                  {currentShop?.super_coin_enabled !== false && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <div style={{ background: '#f5f0fa', color: '#7a4ea5', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(122, 78, 165, 0.15)' }}>
                        ✨ {userDashboardData?.super_coins !== undefined ? userDashboardData.super_coins : 250} Coins
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("cart");
                      setShowProfileDropdown(false);
                    }}
                  >
                    <ShoppingCart size={14} />
                    <span>My Active Cart ({cart.length})</span>
                  </div>

                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("wishlist");
                      setShowProfileDropdown(false);
                    }}
                  >
                    <Heart size={14} />
                    <span>Wishlist ({wishlist.length})</span>
                  </div>

                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("orders");
                      setShowProfileDropdown(false);
                    }}
                  >
                    <ShoppingBag size={14} />
                    <span>Order History</span>
                  </div>

                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("notifications");
                      setShowProfileDropdown(false);
                    }}
                  >
                    <Bell size={14} />
                    <span>Notifications</span>
                  </div>

                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("help_center");
                      setShowProfileDropdown(false);
                    }}
                  >
                    <HelpCircle size={14} />
                    <span>Support Ticket Center</span>
                  </div>

                  {/* Settings Link */}
                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      setCurrentView("user_dashboard");
                      setActivePanel("settings");
                      setShowProfileDropdown(false);
                    }}
                    style={{ borderTop: '1px solid #f0f0f0', marginTop: '4px', paddingTop: '6px' }}
                  >
                    <Settings size={14} />
                    <span style={{ fontWeight: 600 }}>Account Settings</span>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={() => {
                    handleLogout();
                    setShowProfileDropdown(false);
                  }}
                  className="btn-secondary" 
                  style={{ 
                    width: '100%', 
                    padding: '6px 12px', 
                    fontSize: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f'
                  }}
                >
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Wishlist Icon */}
          <div 
            style={{ position: 'relative', cursor: 'pointer' }} 
            onClick={() => setShowWishlistDrawer(true)}
            title="My Wishlist"
          >
            <Heart 
              size={22} 
              style={{ 
                fill: wishlist.length > 0 ? '#ff4d4f' : 'none', 
                color: wishlist.length > 0 ? '#ff4d4f' : '#222222',
                transition: 'transform 0.2s' 
              }} 
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
            {wishlist.length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4d4f', color: '#ffffff', borderRadius: '50%', width: '15px', height: '15px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {wishlist.length}
              </span>
            )}
          </div>

          {/* Cart Icon */}
          <div 
            style={{ position: 'relative', cursor: 'pointer' }} 
            onClick={() => setShowCartDrawer(true)}
            title="Shopping Cart"
          >
            <ShoppingBag 
              size={22} 
              style={{ transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
            {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#7a4ea5',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>

          {/* Logout Button (if logged in) */}
          {role !== 'guest' && (
            <button 
              className="btn-secondary" 
              onClick={handleLogout} 
              style={{ padding: '6px 12px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '8px' }}
            >
              <LogOut size={12} /> Log Out
            </button>
          )}
        </div>

        {/* MOBILE HAMBURGER MENU BUTTON */}
        <div 
          className="mobile-menu-btn" 
          style={{ display: 'none', alignItems: 'center', cursor: 'pointer', color: '#222222' }}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={28} />
        </div>
      </header>

      {/* MOBILE SLIDING MENU OVERLAY (MOCKUP ACCURATE) */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'flex-start'
        }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{
            width: '320px',
            maxWidth: '85%',
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '4px 0 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '50px 0 30px'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Drawer Close Button */}
            <button onClick={() => setMobileMenuOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#888888' }}>
              <X size={24} />
            </button>

            {/* Logo Area */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '50px' }}>
              <img src="/nobaraa_logo_emblem.png" alt="Logo" style={{ width: '54px', height: '54px', objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.5rem', color: '#222222', letterSpacing: '0.5px', marginTop: '10px' }}>
                Nobaraa Fashion
              </span>
            </div>

            {/* Links Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', flexGrow: 1 }}>
              {['Home', 'Shop', 'About Us', 'Contact'].map((item) => (
                <span 
                  key={item} 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView("opac");
                    setActiveCategoryPage(null);
                    setSelectedCategory("");
                    if (item === 'Shop') {
                      setTimeout(() => {
                        const section = document.getElementById("catalog-section");
                        if (section) section.scrollIntoView({ behavior: 'smooth' });
                      }, 200);
                    } else if (item === 'Contact' || item === 'About Us') {
                      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200);
                    }
                  }}
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: item === 'Home' && !activeCategoryPage ? '#7a4ea5' : '#222222',
                    cursor: 'pointer',
                    position: 'relative',
                    paddingBottom: '4px',
                    letterSpacing: '0.5px'
                  }}
                >
                  {item}
                  {item === 'Home' && !activeCategoryPage && (
                    <div style={{ position: 'absolute', bottom: -2, left: 0, width: '100%', height: '2px', background: '#7a4ea5' }} />
                  )}
                </span>
              ))}
            </div>

            {/* Bottom Icons Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', paddingBottom: '20px' }}>
              <Search size={26} color="#222222" style={{ cursor: 'pointer' }} onClick={() => { setMobileMenuOpen(false); document.getElementById("catalog-section")?.scrollIntoView({ behavior: 'smooth' }); }} />
              <User size={26} color="#222222" style={{ cursor: 'pointer' }} onClick={() => { setMobileMenuOpen(false); if(role==='guest'){setLoginRoleTab("user");setShowLoginModal(true);}else{setCurrentView("user_dashboard"); setActivePanel("menu");} }} />
              
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setMobileMenuOpen(false); setShowWishlistDrawer(true); }}>
                <Heart size={26} color="#222222" />
                {wishlist.length > 0 && <span style={{ position: 'absolute', top: -4, right: -6, background: '#7a4ea5', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{wishlist.length}</span>}
              </div>
              
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setMobileMenuOpen(false); setShowCartDrawer(true); }}>
                <ShoppingBag size={26} color="#222222" />
                {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -8, background: '#7a4ea5', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER VIEW: SECURE CHECKOUT (AMAZON STYLE) */}
      {currentView === 'checkout' && (
        <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
          {/* Minimalist Header for Focus */}
          <header style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: isMobile ? '15px 16px' : '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentView('opac')}>
              <NobaraaLogo size={40} color="#2b0b57" />
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: isMobile ? '1.25rem' : '1.4rem', color: '#2b0b57' }}>Nobaraa Checkout</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
              <Lock size={18} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Secure Checkout</span>
            </div>
          </header>

          <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: isMobile ? '20px 12px' : '40px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: isMobile ? '24px' : '32px', alignItems: 'start', flex: 1 }}>
            
            {/* Left Column: Checkout Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Step 1: Delivery Address */}
              <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2b0b57', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#222', fontFamily: 'var(--font-serif)' }}>Delivery Address</h2>
                </div>
                <div style={{ paddingLeft: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {user && user.addresses && user.addresses.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.9rem', color: '#444', display: 'block', marginBottom: '12px', fontWeight: 600 }}>Choose a saved address:</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {user.addresses.map((addr) => {
                          const isSelected = checkoutData.address_id === addr.id;
                          const isLastUsed = user.last_used_address_id === addr.id;
                          return (
                            <div 
                              key={addr.id}
                              onClick={() => {
                                setCheckoutData(prev => ({
                                  ...prev,
                                  shipping_address: addr.address,
                                  billing_phone: addr.phone || user.contact_phone || "",
                                  address_id: addr.id
                                }));
                              }}
                              style={{
                                padding: '16px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #2b0b57' : '1px solid #ccc',
                                background: isSelected ? '#f5eefb' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: isSelected ? '0 4px 12px rgba(43, 11, 87, 0.1)' : 'none'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#2b0b57' : '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {addr.label || 'Saved Address'}
                                  </span>
                                  {isLastUsed && (
                                    <span style={{ background: '#e1bee7', color: '#4a148c', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                                      Last Used
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#333', margin: '0 0 8px 0', lineBreak: 'anywhere' }}>{addr.address}</p>
                              </div>
                              <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, fontWeight: 500 }}>
                                📞 {addr.phone || 'No phone'}
                              </p>
                            </div>
                          );
                        })}
                        <div 
                          onClick={() => {
                            setCheckoutData(prev => ({
                              ...prev,
                              shipping_address: "",
                              billing_phone: user.contact_phone || "",
                              address_id: null
                            }));
                          }}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: checkoutData.address_id === null ? '2px dashed #2b0b57' : '1px dashed #ccc',
                            background: checkoutData.address_id === null ? '#f5eefb' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            minHeight: '110px'
                          }}
                        >
                          <span style={{ fontSize: '1.5rem', marginBottom: '4px', color: checkoutData.address_id === null ? '#2b0b57' : '#666' }}>+</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: checkoutData.address_id === null ? '#2b0b57' : '#555' }}>
                            Use a Custom Address
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutData.address_id !== null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.9rem', color: '#444', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                          Selected Address (Click 'Use a Custom Address' to edit)
                        </label>
                        <textarea 
                          rows={3} 
                          value={checkoutData.shipping_address}
                          readOnly={true}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            outline: 'none', 
                            resize: 'none', 
                            fontSize: '0.95rem',
                            background: '#f5f5f5',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.9rem', color: '#444', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                          Selected Phone (Click 'Use a Custom Address' to edit)
                        </label>
                        <input 
                          type="text" 
                          value={checkoutData.billing_phone}
                          readOnly={true}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            outline: 'none', 
                            fontSize: '0.95rem',
                            background: '#f5f5f5',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* 1. Phone & Pincode side-by-side */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Billing Phone Number</label>
                          <input 
                            type="text" 
                            placeholder="+91..."
                            value={checkoutData.billing_phone}
                            onChange={e => setCheckoutData(prev => ({ ...prev, billing_phone: e.target.value }))}
                            style={{ 
                              width: '100%', 
                              padding: '12px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc', 
                              outline: 'none', 
                              fontSize: '0.95rem',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Pin Code</label>
                          <input 
                            type="text" 
                            placeholder="6-digit PIN code"
                            value={checkoutCustomAddress.pincode || ""}
                            onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, pincode: e.target.value }))}
                            style={{ 
                              width: '100%', 
                              padding: '12px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc', 
                              outline: 'none', 
                              fontSize: '0.95rem',
                            }}
                          />
                        </div>
                      </div>

                      {/* 2. Flat, House no., Building, Company, Apartment */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Flat, House no., Building, Company, Apartment</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Flat 3B, Sunshine Apartments"
                          value={checkoutCustomAddress.flat || ""}
                          onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, flat: e.target.value }))}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            outline: 'none', 
                            fontSize: '0.95rem',
                          }}
                        />
                      </div>

                      {/* 3. Area, Street, Sector, Village */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Area, Street, Sector, Village</label>
                        <input 
                          type="text" 
                          placeholder="e.g. MG Road, Sector 4"
                          value={checkoutCustomAddress.area || ""}
                          onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, area: e.target.value }))}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            outline: 'none', 
                            fontSize: '0.95rem',
                          }}
                        />
                      </div>

                      {/* 4. Landmark (Optional) */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Landmark (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Near Apollo Hospital"
                          value={checkoutCustomAddress.landmark || ""}
                          onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, landmark: e.target.value }))}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            outline: 'none', 
                            fontSize: '0.95rem',
                          }}
                        />
                      </div>

                      {/* 5. Town/City & State */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Town/City</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Mumbai"
                            value={checkoutCustomAddress.city || ""}
                            onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, city: e.target.value }))}
                            style={{ 
                              width: '100%', 
                              padding: '12px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc', 
                              outline: 'none', 
                              fontSize: '0.95rem',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '4px', fontWeight: 600 }}>State</label>
                          <select 
                            value={checkoutCustomAddress.state || ""}
                            onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, state: e.target.value }))}
                            style={{ 
                              width: '100%', 
                              padding: '12px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc', 
                              outline: 'none', 
                              fontSize: '0.95rem',
                              background: '#fff'
                            }}
                          >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 6. Address Type Buttons */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#444', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Address Type</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['House', 'Apartment', 'Business', 'Other'].map(type => (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setCheckoutCustomAddress(prev => ({ ...prev, address_type: type }))}
                              style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: checkoutCustomAddress.address_type === type ? '2px solid #2b0b57' : '1px solid #cbd5e1',
                                background: checkoutCustomAddress.address_type === type ? '#f5eefb' : '#fff',
                                color: checkoutCustomAddress.address_type === type ? '#2b0b57' : '#475569',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 7. Save this address to my profile checkbox */}
                      <div style={{ marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#444' }}>
                          <input 
                            type="checkbox"
                            checked={checkoutCustomAddress.is_default || false}
                            onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                          />
                          Save this address to my profile
                        </label>
                      </div>

                      {/* 8. Delivery Instructions Collapsible */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setCheckoutCustomAddress(prev => ({ ...prev, deliveryInstructionsExpanded: !prev.deliveryInstructionsExpanded }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7a4ea5',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: '4px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {checkoutCustomAddress.deliveryInstructionsExpanded ? 'Hide Delivery Instructions' : '+ Add Delivery Instructions'}
                        </button>
                        {checkoutCustomAddress.deliveryInstructionsExpanded && (
                          <textarea
                            rows={2}
                            placeholder="e.g. Leave with security, ring bell, deliver after 4 PM..."
                            value={checkoutCustomAddress.delivery_instructions || ""}
                            onChange={e => setCheckoutCustomAddress(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              marginTop: '6px',
                              resize: 'vertical'
                            }}
                          />
                        )}
                      </div>

                      {/* Hidden full concatenated address preview for development/debugging */}
                      <div style={{ fontSize: '0.8rem', color: '#888', borderTop: '1px dashed #ccc', paddingTop: '8px', marginTop: '4px' }}>
                        <strong>Address Preview:</strong> {checkoutData.shipping_address || "(empty)"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2b0b57', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#222', fontFamily: 'var(--font-serif)' }}>Payment Method</h2>
                </div>
                <div style={{ paddingLeft: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Payment Options */}
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #e0e0e0', cursor: 'pointer', background: checkoutData.payment_method === 'COD' ? '#fcf9ff' : '#fff' }}>
                      <input 
                        type="radio" 
                        name="payment_method" 
                        value="COD" 
                        checked={checkoutData.payment_method === 'COD'}
                        onChange={e => setCheckoutData(prev => ({ ...prev, payment_method: e.target.value }))}
                        style={{ width: '18px', height: '18px', accentColor: '#2b0b57' }}
                      />
                      <span style={{ fontWeight: 600, color: '#222', fontSize: '1rem' }}>Cash on Delivery (COD)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', cursor: 'pointer', background: checkoutData.payment_method === 'UPI' ? '#fcf9ff' : '#fff' }}>
                      <input 
                        type="radio" 
                        name="payment_method" 
                        value="UPI" 
                        checked={checkoutData.payment_method === 'UPI'}
                        onChange={e => setCheckoutData(prev => ({ ...prev, payment_method: e.target.value }))}
                        style={{ width: '18px', height: '18px', accentColor: '#2b0b57' }}
                      />
                      <span style={{ fontWeight: 600, color: '#222', fontSize: '1rem' }}>UPI / Netbanking</span>
                    </label>
                  </div>

                  {checkoutData.payment_method === 'UPI' && (
                    <div style={{ background: '#f0fbff', border: '1px solid #b3e5fc', padding: '12px', borderRadius: '4px', fontSize: '0.85rem', color: '#0277bd', display: 'flex', gap: '8px' }}>
                      <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                      Razorpay Secure Payment active. Credentials will be securely processed by gateway settings.
                    </div>
                  )}

                  {currentShop?.super_coin_enabled !== false && (
                    <div style={{ padding: '16px', border: '1px dashed var(--coin-gold)', background: '#fffdf5', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Award style={{ color: 'var(--coin-gold)' }} size={24} />
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#222', display: 'block' }}>Redeem SuperCoins</span>
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>Deduct up to 30% of your cart value immediately.</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        style={{ width: '22px', height: '22px', accentColor: 'var(--coin-gold)' }}
                        checked={checkoutData.use_super_coins}
                        onChange={e => setCheckoutData(prev => ({ ...prev, use_super_coins: e.target.checked }))}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#444', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Promo Coupon Code (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Enter code..."
                      value={checkoutData.coupon_code}
                      onChange={e => setCheckoutData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                      style={{ width: '50%', minWidth: '200px', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Review Items */}
              <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2b0b57', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#222', fontFamily: 'var(--font-serif)' }}>Review Items and Delivery</h2>
                </div>
                <div style={{ paddingLeft: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', padding: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#388e3c', margin: '0 0 16px 0', fontWeight: 600 }}>Guaranteed Free Delivery</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeCustomizationCheckout ? (
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <img 
                            src={activeCustomizationCheckout.product_image || null} 
                            alt={activeCustomizationCheckout.product_name} 
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #f0f0f0' }} 
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontWeight: 700, color: '#222', fontSize: '1rem', marginBottom: '4px' }}>
                              {activeCustomizationCheckout.product_name} (Customization Order)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#666' }}>Color:</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', background: '#f5edff', fontSize: '0.75rem', fontWeight: 600 }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: activeCustomizationCheckout.selected_color_hex }} />
                                {activeCustomizationCheckout.selected_color_name}
                              </span>
                            </div>
                            {activeCustomizationCheckout.customization_notes && (
                              <div style={{ fontSize: '0.8rem', color: '#555', background: '#f9f9f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #eee', marginBottom: '4px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {activeCustomizationCheckout.customization_notes}
                              </div>
                            )}
                            <div style={{ color: '#c5a059', fontWeight: 700, fontSize: '1.1rem' }}>
                              ₹{parseFloat(activeCustomizationCheckout.quoted_price || 0).toFixed(2)} / pc
                            </div>
                            <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>
                              Quantity: {activeCustomizationCheckout.quantity}
                            </div>
                          </div>
                        </div>
                      ) : (
                        cart.map(ci => (
                          <div key={ci.id} style={{ display: 'flex', gap: '16px' }}>
                            <img src={ci.product.images[0] || null} alt={ci.product.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #f0f0f0' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#222', fontSize: '1rem', marginBottom: '4px' }}>{ci.product.name}</div>
                              <div style={{ color: '#c5a059', fontWeight: 700, fontSize: '1.1rem' }}>₹{ci.product.price.toFixed(2)}</div>
                              <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>Quantity: {ci.quantity}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Order Summary (Amazon style sticky box) */}
            <div style={{ position: 'sticky', top: '24px' }}>
              <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <button 
                  className="btn-primary" 
                  onClick={handlePlaceOrder}
                  disabled={!checkoutData.shipping_address || !checkoutData.billing_phone}
                  style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 600, justifyContent: 'center', background: '#f0c14b', color: '#111', border: '1px solid #a88734', textShadow: 'none', boxShadow: '0 1px 0 rgba(255,255,255,.4) inset' }}
                >
                  Place your order
                </button>
                <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', lineHeight: '1.4' }}>
                  By placing your order, you agree to Nobaraa's privacy notice and conditions of use.
                </div>

                <div style={{ borderTop: '1px solid #e0e0e0', margin: '0' }}></div>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#222', margin: 0, fontFamily: 'var(--font-serif)' }}>Order Summary</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem', color: '#444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items ({activeCustomizationCheckout ? activeCustomizationCheckout.quantity : cart.reduce((sum, item) => sum + item.quantity, 0)}):</span>
                    <span>₹{(activeCustomizationCheckout ? (activeCustomizationCheckout.quoted_price * activeCustomizationCheckout.quantity) : cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Delivery:</span>
                    <span style={{ fontWeight: checkoutShippingCharge > 0 ? 600 : 'normal' }}>
                      {checkoutShippingCharge > 0 ? `₹${checkoutShippingCharge.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                  {!activeCustomizationCheckout && checkoutData.use_super_coins && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#388e3c' }}>
                      <span>SuperCoin Discount:</span>
                      <span>-₹{(cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * 0.15).toFixed(2)}</span>
                    </div>
                  )}
                  {!activeCustomizationCheckout && checkoutData.coupon_code && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#388e3c' }}>
                      <span>Coupon Discount:</span>
                      <span>-₹{checkoutCouponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                    <span>GST ({checkoutGstRate}% {checkoutGstInclusive ? 'Inclusive' : 'Exclusive'}):</span>
                    <span>₹{checkoutGstAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e0e0e0', margin: '0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#b12704' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Order Total:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>
                    ₹{checkoutFinalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </main>
        </div>
      )}

      {/* RENDER VIEW: PRODUCT DETAIL (FLIPKART STYLE) */}
      {currentView === 'product_detail' && activeProduct && (
        <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: isMobile ? '20px 12px' : '20px 40px', background: '#ffffff' }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ cursor: 'pointer', color: '#7a4ea5' }} onClick={() => setCurrentView('opac')}>Home</span>
            <span>/</span>
            <span style={{ cursor: 'pointer', color: '#7a4ea5' }} onClick={() => setCurrentView('opac')}>{activeProduct.category_name}</span>
            <span>/</span>
            <span style={{ color: '#222' }}>{activeProduct.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(400px, 450px) 1fr', gap: isMobile ? '24px' : '40px', alignItems: 'start' }}>
            {/* Left Column: Images & Actions */}
            <div style={{ position: isMobile ? 'static' : 'sticky', top: '100px', minWidth: 0 }}>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: '4px', padding: '16px', display: 'flex', justifyContent: 'center', background: '#fff', height: isMobile ? '300px' : '450px', overflow: 'hidden' }}>
                <img 
                  src={activeProduct.images[activeProductImageIndex] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} 
                  alt={activeProduct.name}
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'crosshair', transition: 'transform 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>

              {activeProduct.images.length > 1 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginTop: '16px', 
                  overflowX: 'auto', 
                  paddingBottom: '8px',
                  width: '100%',
                  maxWidth: '100%',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {activeProduct.images.map((img, i) => (
                    <div 
                      key={i}
                      onClick={() => setActiveProductImageIndex(i)}
                      style={{ 
                        width: '64px', 
                        height: '64px', 
                        flexShrink: 0,
                        border: activeProductImageIndex === i ? '2px solid #7a4ea5' : '1px solid #e0e0e0',
                        padding: '4px', 
                        cursor: 'pointer', 
                        borderRadius: '8px',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      <img src={img || null} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Single / Bulk Purchase Mode Toggle */}
              {activeProduct.bulk_sale_price && activeProduct.min_quantity && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '0', border: '2px solid rgba(122,78,165,0.25)', borderRadius: '12px', overflow: 'hidden', background: '#f9f5ff' }}>
                  <button
                    onClick={() => setPurchaseMode('single')}
                    style={{
                      flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px', transition: 'all 0.2s ease',
                      background: purchaseMode === 'single' ? 'linear-gradient(135deg, #7a4ea5, #56337a)' : 'transparent',
                      color: purchaseMode === 'single' ? '#fff' : '#7a4ea5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <ShoppingBag size={16} /> Single Unit
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>₹{activeProduct.price?.toFixed(2)}</span>
                  </button>
                  <div style={{ width: '1px', background: 'rgba(122,78,165,0.2)' }} />
                  <button
                    onClick={() => setPurchaseMode('bulk')}
                    style={{
                      flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px', transition: 'all 0.2s ease',
                      background: purchaseMode === 'bulk' ? 'linear-gradient(135deg, #7a4ea5, #56337a)' : 'transparent',
                      color: purchaseMode === 'bulk' ? '#fff' : '#7a4ea5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <Tag size={16} /> Bulk Order
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>₹{activeProduct.bulk_sale_price?.toFixed(2)}</span>
                  </button>
                </div>
              )}

              {/* Bulk mode info banner */}
              {activeProduct.bulk_sale_price && activeProduct.min_quantity && purchaseMode === 'bulk' && (
                <div style={{ marginTop: '12px', padding: '12px 16px', background: 'linear-gradient(135deg, rgba(122,78,165,0.08), rgba(86,51,122,0.05))', border: '1px solid rgba(122,78,165,0.2)', borderRadius: '10px', fontSize: '0.85rem', color: '#56337a', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem' }}>📦</span>
                  <span>Bulk price of <strong>₹{activeProduct.bulk_sale_price?.toFixed(2)}</strong> applies when you order <strong>{activeProduct.min_quantity}+</strong> units. You save <strong>₹{(activeProduct.price - activeProduct.bulk_sale_price)?.toFixed(2)}</strong> per unit!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  onClick={() => {
                    const qty = purchaseMode === 'bulk' && activeProduct.min_quantity ? activeProduct.min_quantity : 1;
                    handleAddToCart(activeProduct.id, qty);
                  }}
                  disabled={activeProduct.stock <= 0}
                  style={{ 
                    flex: 1, 
                    padding: isMobile ? '10px 12px' : '16px', 
                    fontSize: isMobile ? '0.85rem' : '1.1rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    border: '2px solid #7a4ea5',
                    color: '#7a4ea5',
                    borderRadius: '12px',
                    cursor: activeProduct.stock <= 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ShoppingCart size={isMobile ? 16 : 20} /> {purchaseMode === 'bulk' ? `ADD ${activeProduct.min_quantity || 1} TO CART` : 'ADD TO CART'}
                </button>
                <button 
                  onClick={() => {
                    const qty = purchaseMode === 'bulk' && activeProduct.min_quantity ? activeProduct.min_quantity : 1;
                    handleAddToCart(activeProduct.id, qty);
                    setCurrentView('user_dashboard');
                    setActivePanel('cart');
                  }}
                  disabled={activeProduct.stock <= 0}
                  style={{ 
                    flex: 1, 
                    padding: isMobile ? '10px 12px' : '16px', 
                    fontSize: isMobile ? '0.85rem' : '1.1rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #7a4ea5 0%, #2b0b57 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(122, 78, 165, 0.2)',
                    cursor: activeProduct.stock <= 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ShoppingBag size={isMobile ? 16 : 20} /> BUY NOW
                </button>
              </div>

              {activeProduct.customization_enabled && (
                <div style={{ marginTop: '16px' }}>
                  <button
                    onClick={() => {
                      if (role === 'guest') {
                        setLoginRoleTab("user");
                        setShowLoginModal(true);
                        addToast("Authentication Required", "Please login to place a customization order.", "info");
                      } else {
                        setCustomizingProduct(activeProduct);
                        const palette = currentShop?.color_palette || [];
                        setSelectedCustomColor(palette.length > 0 ? palette[0] : null);
                        setCustomSizingNotes("");
                        setCustomQuantity(currentShop?.customization_min_quantity || 1);
                      }
                    }}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: isMobile ? '10px 12px' : '16px',
                      fontSize: isMobile ? '0.85rem' : '1.1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #7a4ea5 0%, #2b0b57 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(122, 78, 165, 0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Sparkles size={isMobile ? 16 : 20} /> BESPOKE CUSTOMIZATION
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', color: '#2b0b57', fontWeight: 700, margin: '0 0 12px 0', fontFamily: 'var(--font-serif)' }}>{activeProduct.name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {(() => {
                      const reviews = activeProduct.reviews || [];
                      const avgRating = reviews.length > 0 
                        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
                        : "0.0";
                      return (
                        <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {avgRating} <Star size={14} fill="white" />
                        </span>
                      );
                    })()}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>{(activeProduct.reviews || []).length} Ratings & Reviews</span>
                    <span className="badge badge-info">{activeProduct.category_name}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSharingProduct(activeProduct)}
                  style={{ background: '#f5edff', border: 'none', color: '#7a4ea5', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                  title="Share Saree"
                  onMouseEnter={e => { e.currentTarget.style.background = '#e8d8fc'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f5edff'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Share2 size={20} />
                </button>
              </div>

              {/* Price Block */}
              <div>
                <div style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                  {purchaseMode === 'bulk' ? 'Bulk / Wholesale Price' : 'Special price'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 700, color: '#222222', lineHeight: 1 }}>
                    ₹{purchaseMode === 'bulk' && activeProduct.bulk_sale_price
                      ? activeProduct.bulk_sale_price.toFixed(2)
                      : activeProduct.price.toFixed(2)}
                  </span>
                  {purchaseMode === 'single' && activeProduct.original_price > activeProduct.price && (
                    <>
                      <span style={{ fontSize: '1.2rem', color: '#878787', textDecoration: 'line-through', marginBottom: '4px' }}>₹{activeProduct.original_price.toFixed(2)}</span>
                      <span style={{ fontSize: '1.2rem', color: 'var(--coin-gold)', fontWeight: 700, marginBottom: '4px' }}>
                        {Math.round(((activeProduct.original_price - activeProduct.price) / activeProduct.original_price) * 100)}% off
                      </span>
                    </>
                  )}
                  {purchaseMode === 'bulk' && activeProduct.bulk_sale_price && (
                    <>
                      <span style={{ fontSize: '1.2rem', color: '#878787', textDecoration: 'line-through', marginBottom: '4px' }}>₹{activeProduct.price.toFixed(2)}</span>
                      <span style={{ fontSize: '1.2rem', color: 'var(--coin-gold)', fontWeight: 700, marginBottom: '4px' }}>
                        {Math.round(((activeProduct.price - activeProduct.bulk_sale_price) / activeProduct.price) * 100)}% bulk off
                      </span>
                    </>
                  )}
                </div>
                {purchaseMode === 'bulk' && activeProduct.min_quantity && (
                  <div style={{ fontSize: '0.82rem', color: '#7a4ea5', marginTop: '6px', fontWeight: 600 }}>
                    Min. order: {activeProduct.min_quantity} units · Save ₹{((activeProduct.price - activeProduct.bulk_sale_price) * activeProduct.min_quantity).toFixed(2)} on minimum order
                  </div>
                )}
              </div>

              {/* Offers */}
              {(activeProduct.bulk_sale_price || activeProduct.customization_enabled || activeProduct.promo_code) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #f0e6fc', padding: '16px', borderRadius: '12px', background: '#fdfcff' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2b0b57', margin: '0 0 4px 0', fontFamily: 'var(--font-serif)' }}>Available Offers</h3>
                  
                  {activeProduct.promo_code && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.9rem', color: '#444' }}>
                      <Tag size={16} color="var(--accent-primary)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span><b>Special Coupon</b> Use code <span style={{ fontWeight: 700, color: 'var(--coin-gold)' }}>{activeProduct.promo_code}</span> for extra discount at checkout</span>
                    </div>
                  )}
                  {activeProduct.bulk_sale_price && activeProduct.min_quantity && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.9rem', color: '#444' }}>
                      <Tag size={16} color="var(--accent-primary)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span><b>Bulk Order Savings</b> Get wholesale pricing! Buy <b>{activeProduct.min_quantity}</b> or more items for only <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>₹{activeProduct.bulk_sale_price.toFixed(2)}</span> each.</span>
                    </div>
                  )}
                  {activeProduct.customization_enabled && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.9rem', color: '#444' }}>
                      <Tag size={16} color="var(--accent-primary)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span><b>Custom Tailoring</b> Custom colors, dimensions, and design options available on request. Tap Bespoke Customization below.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Specs & Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px', fontSize: '0.95rem', color: '#444', borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Description</div>
                <div style={{ lineHeight: '1.6' }}>{activeProduct.description}</div>
                
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Stock</div>
                <div style={{ color: activeProduct.stock > 0 ? '#222' : '#ff6161', fontWeight: 600 }}>
                  {activeProduct.stock > 0 ? `In Stock (${activeProduct.stock} items left)` : 'Out of Stock'}
                </div>
                
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Seller</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#2b0b57', fontWeight: 700 }}>{activeProduct.shop_name || "Kirubanithi Enterprises"}</span>
                </div>
              </div>

              {/* Ratings and Reviews */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '24px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#2b0b57', fontFamily: 'var(--font-serif)' }}>Ratings & Reviews</h2>
                  {role === 'user' && (
                    <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => document.getElementById("review-form-flipkart")?.scrollIntoView({behavior: "smooth"})}>Rate Product</button>
                  )}
                </div>
                
                {(() => {
                  const reviews = activeProduct.reviews || [];
                  const totalReviews = reviews.length;
                  const avgRating = totalReviews > 0 
                    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
                    : "0.0";
                  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  reviews.forEach(r => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Summary Stats Grid */}
                      <div className="glass-panel" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'center', background: 'rgba(122, 78, 165, 0.02)', borderColor: 'rgba(122, 78, 165, 0.1)', borderRadius: '16px' }}>
                        {/* Left Stats card */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid rgba(122, 78, 165, 0.15)', paddingRight: '20px' }}>
                          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#2b0b57', margin: 0, fontFamily: 'var(--font-serif)' }}>{avgRating}</h1>
                          <div style={{ display: 'flex', gap: '4px', margin: '8px 0', color: '#ffc107' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                size={16} 
                                fill={star <= Math.round(Number(avgRating)) ? "#ffc107" : "none"} 
                                color={star <= Math.round(Number(avgRating)) ? "#ffc107" : "#e0e0e0"} 
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{totalReviews} Ratings & Reviews</span>
                        </div>

                        {/* Right Progress bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[5, 4, 3, 2, 1].map(starsCount => {
                            const count = counts[starsCount];
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div key={starsCount} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                                <span style={{ width: '50px', fontWeight: 700, color: '#2b0b57', textAlign: 'right' }}>{starsCount} Stars</span>
                                <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #7a4ea5, #2b0b57)', borderRadius: '4px' }} />
                                </div>
                                <span style={{ width: '35px', color: 'var(--text-muted)', fontWeight: 500 }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Review submit form */}
                      {role === 'user' && (
                        <form id="review-form-flipkart" onSubmit={(e) => handleCreateReview(e, activeProduct.id)} className="glass-panel" style={{ border: '1px solid rgba(122, 78, 165, 0.12)', borderRadius: '16px', padding: '24px', background: '#ffffff', boxShadow: '0 8px 30px rgba(122,78,165,0.03)' }}>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#2b0b57', fontWeight: 800, fontFamily: 'var(--font-serif)' }}>Write a Review</h4>
                          
                          {/* Interactive star selector */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '0.95rem', color: '#444', fontWeight: 600 }}>Your Rating:</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {[1, 2, 3, 4, 5].map(starIndex => (
                                <Star 
                                  key={starIndex}
                                  size={28}
                                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                  fill={newReview.rating >= starIndex ? "#ffc107" : "none"}
                                  color={newReview.rating >= starIndex ? "#ffc107" : "#d0d0d0"}
                                  onClick={() => setNewReview(prev => ({ ...prev, rating: starIndex }))}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: '#7a4ea5', fontWeight: 700 }}>
                              {newReview.rating} Stars ({
                                newReview.rating === 5 ? 'Excellent' :
                                newReview.rating === 4 ? 'Very Good' :
                                newReview.rating === 3 ? 'Good' :
                                newReview.rating === 2 ? 'Fair' : 'Poor'
                              })
                            </span>
                          </div>

                          <textarea 
                            placeholder="Tell us what you think about this product..." 
                            rows={4} 
                            value={newReview.comment}
                            onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                            style={{ width: '100%', padding: '16px', border: '1px solid #e2d9f0', borderRadius: '12px', outline: 'none', resize: 'vertical', marginBottom: '20px', fontSize: '0.95rem', fontFamily: 'inherit', transition: 'all 0.3s' }}
                            onFocus={e => {e.target.style.borderColor = '#7a4ea5'; e.target.style.boxShadow = '0 0 0 3px rgba(122,78,165,0.1)'}}
                            onBlur={e => {e.target.style.borderColor = '#e2d9f0'; e.target.style.boxShadow = 'none'}}
                            required
                          />

                          {/* File upload section */}
                          <div style={{ marginBottom: '24px' }}>
                            <span style={{ display: 'block', fontSize: '0.95rem', color: '#444', fontWeight: 600, marginBottom: '10px' }}>Add Photo to your Review:</span>
                            
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <label 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  padding: '10px 20px', 
                                  background: '#f8f5fc', 
                                  color: '#7a4ea5', 
                                  border: '1px dashed #7a4ea5', 
                                  borderRadius: '12px', 
                                  fontSize: '0.9rem', 
                                  fontWeight: 700, 
                                  cursor: isUploadingReviewImage ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Camera size={18} />
                                {isUploadingReviewImage ? 'Uploading...' : 'Attach Image'}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleUploadReviewImage} 
                                  disabled={isUploadingReviewImage} 
                                  style={{ display: 'none' }} 
                                />
                              </label>
                              
                              {newReview.image_url && (
                                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', border: '1px solid #e0d0f5', overflow: 'hidden' }}>
                                  <img src={newReview.image_url} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <button 
                                    type="button"
                                    onClick={() => setNewReview(prev => ({ ...prev, image_url: "" }))} 
                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <button type="submit" className="btn-primary" style={{ padding: '12px 32px', fontWeight: 700, borderRadius: '12px', letterSpacing: '0.5px' }}>Submit Review</button>
                        </form>
                      )}

                      {/* Review Listings */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        {reviews.length > 0 ? (
                          reviews.map(r => (
                            <div key={r.id} className="glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', borderColor: '#f0eaf8', borderRadius: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {/* User initial avatar */}
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #7a4ea5 0%, #2b0b57 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 8px rgba(122,78,165,0.15)' }}>
                                    {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'A'}
                                  </div>
                                  <div>
                                    <h5 style={{ fontWeight: 700, color: '#2b0b57', fontSize: '0.95rem', margin: 0 }}>{r.user_name}</h5>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#52c41a', marginTop: '2px', fontWeight: 600 }}>
                                      <ShieldCheck size={14} />
                                      <span>Verified Purchaser</span>
                                    </div>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently'}
                                </span>
                              </div>
                              
                              {/* Rating Star Bar */}
                              <div style={{ display: 'flex', gap: '4px', color: '#ffc107' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star 
                                    key={star} 
                                    size={14} 
                                    fill={star <= r.rating ? "#ffc107" : "none"} 
                                    color={star <= r.rating ? "#ffc107" : "#e0e0e0"} 
                                  />
                                ))}
                              </div>
                              
                              {/* Review comment */}
                              <p style={{ fontSize: '0.95rem', color: '#444', margin: 0, lineHeight: 1.6 }}>{r.comment}</p>
                              
                              {/* Review Attachment Image */}
                              {r.image_url && (
                                <div style={{ marginTop: '4px' }}>
                                  <img 
                                    src={r.image_url} 
                                    alt="Review attachment" 
                                    onClick={() => setActiveReviewImagePreview(r.image_url)}
                                    style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #f0e6fc', cursor: 'zoom-in', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#faf8fe', borderRadius: '16px', border: '1px dashed #e2d9f0' }}>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>No reviews yet. Be the first to leave one!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Recommended / Similar Products */}
          <div style={{ marginTop: '40px', borderTop: '1px solid #f0f0f0', paddingTop: '32px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 24px 0', color: '#2b0b57', fontFamily: 'var(--font-serif)' }}>Similar Elegant Products</h2>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', paddingRight: '20px' }}>
              {products
                .filter(p => p.category_id === activeProduct.category_id && p.id !== activeProduct.id)
                .slice(0, 8)
                .map(p => (
                  <div key={p.id} onClick={() => {handleProductSelection(p.id); window.scrollTo(0,0);}} style={{ minWidth: '240px', width: '240px', border: '1px solid #f0e6fc', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', background: '#fff', transition: 'all 0.3s ease' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(122, 78, 165, 0.1)'}} onMouseLeave={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'}}>
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', overflow: 'hidden', borderRadius: '8px' }}>
                      <img src={p.images[0] || null} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '1rem', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px', fontWeight: 600, fontFamily: 'var(--font-serif)' }} title={p.name}>{p.name}</div>
                    <div style={{ color: 'var(--coin-gold)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 700 }}>{Math.round(Math.random() * 20 + 10)}% Special Discount</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2b0b57' }}>₹{p.price.toFixed(2)}</div>
                  </div>
              ))}
              {products.filter(p => p.category_id === activeProduct.category_id && p.id !== activeProduct.id).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>No similar products found in this category.</div>
              )}
            </div>
          </div>

          {/* Recently Viewed Products */}
          {recentlyViewed.filter(p => p.id !== activeProduct.id).length > 0 && (
            <div style={{ marginTop: '40px', borderTop: '1px solid #f0f0f0', paddingTop: '32px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 24px 0', color: '#2b0b57', fontFamily: 'var(--font-serif)' }}>Recently Viewed Products</h2>
              <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', paddingRight: '20px' }}>
                {recentlyViewed
                  .filter(p => p.id !== activeProduct.id)
                  .map(p => (
                    <div key={p.id} onClick={() => {handleProductSelection(p.id); window.scrollTo(0,0);}} style={{ minWidth: '240px', width: '240px', border: '1px solid #f0e6fc', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', background: '#fff', transition: 'all 0.3s ease' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(122, 78, 165, 0.1)'}} onMouseLeave={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'}}>
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', overflow: 'hidden', borderRadius: '8px' }}>
                        <img src={p.images[0] || null} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ fontSize: '1rem', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px', fontWeight: 600, fontFamily: 'var(--font-serif)' }} title={p.name}>{p.name}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2b0b57' }}>₹{p.price.toFixed(2)}</div>
                    </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* RENDER VIEW 1: PUBLIC OPAC VIEW */}
      {currentView === 'opac' && (
        <>
          {!activeCategoryPage && (
            <div className="animate-fade-in" style={{ width: '100%' }}>
              <NobaraaHero sareeModels={currentSareeModels} />
            </div>
          )}
          <main className="main-content" style={{ maxWidth: '100%', margin: '0 auto', width: '100%', padding: isMobile ? '0' : '0 40px' }}>
          
          {activeCategoryPage ? (
            <div className="animate-fade-in" style={{ width: '100%', padding: isMobile ? '10px 0' : '20px 0' }}>
              
              {/* Category Page Breadcrumb / Navigation bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '20px' : '30px', padding: isMobile ? '0 12px' : '0' }}>
                <button 
                  onClick={() => setActiveCategoryPage(null)} 
                  className="btn-secondary"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 16px', 
                    borderRadius: '0px', 
                    border: '1px solid #222222',
                    background: 'transparent',
                    color: '#222222',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Collections
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>
                <span style={{ fontSize: '0.8rem', color: '#222222', fontWeight: 600 }}>{activeCategoryPage.name}</span>
              </div>

              {/* Premium Luxury Jumbotron Cover for Category */}
              <div style={{ 
                position: 'relative', 
                height: isMobile ? '200px' : '350px', 
                background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${activeCategoryPage.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'white',
                padding: isMobile ? '20px 16px' : '40px',
                marginBottom: isMobile ? '20px' : '40px'
              }}>
                <div>
                  <h1 style={{ 
                    fontFamily: 'var(--font-serif)', 
                    fontSize: isMobile ? '1.8rem' : '3rem', 
                    fontWeight: 700, 
                    marginBottom: '12px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                  }}>
                    {activeCategoryPage.name}
                  </h1>
                  <p style={{ 
                    fontSize: isMobile ? '0.85rem' : '1.1rem', 
                    maxWidth: '650px', 
                    margin: '0 auto',
                    opacity: 0.9,
                    fontWeight: 300,
                    fontFamily: "'Jost', sans-serif"
                  }}>
                    {activeCategoryPage.description || `Indulge in our exquisite collection of premium ${activeCategoryPage.name} sarees. Masterfully hand-draped and woven for your grand festive celebrations.`}
                  </p>
                </div>
              </div>

              {/* Dedicated Category Product Catalog Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', padding: isMobile ? '0 12px' : '0' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.6rem', color: '#222222', margin: 0 }}>
                  Curated Catalog ({products.filter(p => p.category_id === activeCategoryPage.id).length} Items)
                </h3>
              </div>

              <div className="category-product-grid">
                {products.filter(p => p.category_id === activeCategoryPage.id).length > 0 ? (
                  products.filter(p => p.category_id === activeCategoryPage.id).map(p => (
                    <div key={p.id} className="product-card" onClick={() => handleProductSelection(p.id)}
                    style={{ 
                      background: '#ffffff', 
                      borderRadius: '20px', 
                      overflow: 'hidden', 
                      boxShadow: '0 8px 24px rgba(122, 78, 165, 0.08)',
                      border: '1px solid #f0e6fc',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.boxShadow = '0 15px 35px rgba(122, 78, 165, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 78, 165, 0.08)';
                    }}
                    >
                      <div className="product-image-container" style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
                        <img className="product-img primary-image" src={p.images[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease, transform 0.6s ease' }} />
                        {p.images[1] && (
                          <img className="product-img secondary-image" src={p.images[1]} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.6s ease, transform 0.6s ease', pointerEvents: 'none' }} />
                        )}
                        {p.original_price > p.price && (
                          <div className="product-discount-tag" style={{ position: 'absolute', top: '16px', left: '16px', background: 'linear-gradient(135deg, #e84e7e 0%, #c12b5b 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 4px 10px rgba(232, 78, 126, 0.3)', zIndex: 2 }}>
                            {Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF
                          </div>
                        )}
                        <button 
                          onClick={e => {
                            e.stopPropagation();
                            handleAddToWishlist(p.id);
                          }} 
                          style={{ position: 'absolute', top: '16px', right: '16px', background: '#ffffff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e84e7e', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s ease', zIndex: 2 }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Heart size={18} />
                        </button>
                      </div>
                      
                      <div className="product-info" style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.75rem', color: '#7a4ea5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{p.category_name}</span>
                        <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: '#2b0b57', marginBottom: '8px', lineHeight: 1.3 }}>{p.name}</h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                          <span className="badge badge-success" style={{ background: '#f5edff', color: '#7a4ea5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px' }}>
                            {(4.0 + (p.id % 10) * 0.1).toFixed(1)} <Award size={12} />
                          </span>
                          <span style={{ color: '#666666', fontFamily: "'Jost', sans-serif" }}>({(p.id * 7 + 15)} reviews)</span>
                        </div>

                        <p className="product-description" style={{ fontFamily: "'Jost', sans-serif", color: '#666666', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px', flexGrow: 1 }}>{p.description}</p>
                        
                        <div className="price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
                          <span className="current-price" style={{ fontFamily: "'Jost', sans-serif", color: '#2b0b57', fontSize: '1.4rem', fontWeight: 800 }}>₹{p.price.toFixed(2)}</span>
                          {p.original_price > p.price && (
                            <span className="original-price" style={{ textDecoration: 'line-through', fontSize: '0.9rem', color: '#999999' }}>₹{p.original_price.toFixed(2)}</span>
                          )}
                        </div>
                        
                        <button 
                          onClick={e => {
                            e.stopPropagation();
                            handleAddToCart(p.id);
                          }} 
                          style={{ 
                            background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                            border: 'none',
                            borderRadius: '30px',
                            padding: '12px',
                            justifyContent: 'center', 
                            width: '100%',
                            fontFamily: "'Jost', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '1px',
                            boxShadow: '0 6px 16px rgba(122, 78, 165, 0.25)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'white',
                            cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                            opacity: p.stock > 0 ? 1 : 0.6
                          }}
                          onMouseEnter={e => {
                            if(p.stock > 0) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(122, 78, 165, 0.3)';
                            }
                          }}
                          onMouseLeave={e => {
                            if(p.stock > 0) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(122, 78, 165, 0.25)';
                            }
                          }}
                          disabled={p.stock <= 0}
                        >
                          <ShoppingCart size={16} /> {p.stock > 0 ? "ADD TO CART" : "OUT OF STOCK"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 48px', color: 'var(--text-muted)', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
                    <p>No products currently available under this category. We are weaving new designs soon!</p>
                  </div>
                )}
              </div>

              {/* Bottom Back Button */}
              <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setActiveCategoryPage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  className="btn-primary"
                  style={{ padding: '12px 28px' }}
                >
                  ← Back to Home Collections
                </button>
              </div>

            </div>
          ) : (
            <>
              {/* Dynamic Collections Sections */}
              <div id="catalog-section" style={{ paddingTop: '20px' }}></div>



              {/* Dynamic Collections Sections */}
              {collections.length > 0 ? (
                collections.map(col => {
                  const colCategories = categories.filter(c => col.category_ids.includes(c.id));
                  const colProducts = products.filter(p => col.category_ids.includes(p.category_id));
                  const isCategoryFromThisCollectionSelected = col.category_ids.includes(parseInt(selectedCategory));
                  const displayedProducts = isCategoryFromThisCollectionSelected 
                    ? colProducts.filter(p => p.category_id === parseInt(selectedCategory))
                    : colProducts;
                  const showSeparateCategoriesMobile = col.separate_categories_mobile && isMobile;

                  if (colCategories.length === 0) return null;

                  return (
                    <div key={col.id} style={{ marginBottom: '80px', width: '100%', position: 'relative', padding: '40px 0', overflow: 'hidden' }} className="animate-fade-in">
                      
                      {/* Leafy Corner branches */}
                      <img 
                        src="/nobaraa_flowers.png" 
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          left: isMobile ? '-12px' : '-40px', 
                          width: isMobile ? '120px' : '190px', 
                          height: 'auto', 
                          opacity: 0.6, 
                          transform: 'rotate(-45deg)', 
                          pointerEvents: 'none' 
                        }} 
                        alt="" 
                      />
                      <img 
                        src="/nobaraa_flowers.png" 
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          right: isMobile ? '-12px' : '-40px', 
                          width: isMobile ? '120px' : '190px', 
                          height: 'auto', 
                          opacity: 0.6, 
                          transform: 'rotate(45deg) scaleX(-1)', 
                          pointerEvents: 'none' 
                        }} 
                        alt="" 
                      />

                      {/* Header Ribbon Line & centered logo mark */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ width: '40px', height: '1px', background: '#7a4ea5', opacity: 0.4 }}></div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#7a4ea5', fontWeight: 'bold', fontStyle: 'italic' }}>n</span>
                        <div style={{ width: '40px', height: '1px', background: '#7a4ea5', opacity: 0.4 }}></div>
                      </div>

                      {/* Collection Header Title */}
                      {renderCollectionTitle(col.name)}
                      
                      {/* Subtitle */}
                      <p style={{ 
                        fontFamily: "'Jost', sans-serif", 
                        fontSize: '0.95rem', 
                        color: '#666666', 
                        textAlign: 'center', 
                        marginBottom: '40px',
                        marginTop: '-5px'
                      }}>
                        Find everything you love, all in one place.
                      </p>

                      {showSeparateCategoriesMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '0 8px' }}>
                          {colCategories
                            .filter(c => !selectedCategory || c.id === parseInt(selectedCategory))
                            .map(c => {
                              const catProducts = products.filter(p => p.category_id === c.id);
                              return (
                                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {/* Category Banner */}
                                  {col.show_category_banner !== false && col.show_category_banner !== 0 ? (
                                    <div 
                                      style={{
                                        position: 'relative',
                                        height: '110px',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '20px',
                                        boxShadow: '0 4px 12px rgba(122, 78, 165, 0.08)',
                                        background: 'linear-gradient(135deg, #7a4ea5 0%, #2b0b57 100%)',
                                        cursor: 'pointer'
                                      }} 
                                      onClick={() => { setActiveCategoryPage(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                      {c.image_url && (
                                        <img 
                                          src={c.image_url} 
                                          alt={c.name} 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, position: 'absolute', top: 0, left: 0 }}
                                        />
                                      )}
                                      <div style={{ position: 'relative', zIndex: 2, color: '#ffffff' }}>
                                        <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{c.name}</h4>
                                        {c.description && <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>{c.description}</p>}
                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Shop Collection <ChevronRight size={10} /></span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '4px 6px',
                                        borderBottom: '1px solid rgba(122, 78, 165, 0.1)',
                                        marginBottom: '6px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => { setActiveCategoryPage(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    >
                                      <h5 style={{ 
                                        fontFamily: "'Playfair Display', serif", 
                                        fontSize: '1.15rem', 
                                        fontWeight: 700, 
                                        color: '#2b0b57', 
                                        margin: 0, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.5px' 
                                      }}>
                                        {c.name}
                                      </h5>
                                      <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#7a4ea5', 
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}>
                                        View All <ChevronRight size={12} />
                                      </span>
                                    </div>
                                  )}

                                  {/* Category Products */}
                                  <div className="product-grid animate-fade-in">
                                    {catProducts.length > 0 ? (
                                      catProducts.map((p, idx) => (
                                        <div key={p.id} className="scroll-reveal" style={{ transitionDelay: `${(idx % 4) * 0.12}s` }}>
                                          <div className="product-card" onClick={() => handleProductSelection(p.id)}
                                          style={{ 
                                            background: '#ffffff', 
                                            borderRadius: '20px', 
                                            overflow: 'hidden', 
                                            boxShadow: '0 8px 24px rgba(122, 78, 165, 0.08)',
                                            border: '1px solid #f0e6fc',
                                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            height: '100%'
                                          }}
                                          >
                                            <div className={`product-image-container ${p.images[1] ? 'has-secondary' : ''}`} style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                                              <img className="product-img primary-image" src={p.images[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease, transform 0.6s ease' }} />
                                              {p.images[1] && (
                                                <img className="product-img secondary-image" src={p.images[1]} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.6s ease, transform 0.6s ease', pointerEvents: 'none' }} />
                                              )}
                                              {p.original_price > p.price && (
                                                <div className="product-discount-tag" style={{ position: 'absolute', top: '16px', left: '16px', background: 'linear-gradient(135deg, #e84e7e 0%, #c12b5b 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 4px 10px rgba(232, 78, 126, 0.3)', zIndex: 2 }}>
                                                  {Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF
                                                </div>
                                              )}
                                              <button 
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  handleAddToWishlist(p.id);
                                                }} 
                                                style={{ position: 'absolute', top: '16px', right: '16px', background: '#ffffff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e84e7e', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s ease', zIndex: 2 }}
                                              >
                                                <Heart size={18} />
                                              </button>
                                            </div>
                                            
                                            <div className="product-info" style={{ padding: '16px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.75rem', color: '#7a4ea5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{p.category_name}</span>
                                              <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: '#2b0b57', marginBottom: '8px', lineHeight: 1.3 }}>{p.name}</h4>
                                              
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                                                <span className="badge badge-success" style={{ background: '#f5edff', color: '#7a4ea5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px' }}>
                                                  {(4.0 + (p.id % 10) * 0.1).toFixed(1)} <Award size={12} />
                                                </span>
                                                <span style={{ color: '#666666', fontFamily: "'Jost', sans-serif" }}>({(p.id * 7 + 15)})</span>
                                              </div>

                                              <div className="price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
                                                <span className="current-price" style={{ fontFamily: "'Jost', sans-serif", color: '#2b0b57', fontSize: '1.2rem', fontWeight: 800 }}>₹{p.price.toFixed(2)}</span>
                                                {p.original_price > p.price && (
                                                  <span className="original-price" style={{ textDecoration: 'line-through', fontSize: '0.9rem', color: '#999999' }}>₹{p.original_price.toFixed(2)}</span>
                                                )}
                                              </div>

                                              <button 
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  handleAddToCart(p.id);
                                                }}
                                                style={{ 
                                                  background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                                                  border: 'none',
                                                  borderRadius: '30px',
                                                  padding: '10px',
                                                  justifyContent: 'center', 
                                                  width: '100%',
                                                  fontFamily: "'Jost', sans-serif",
                                                  fontWeight: 700,
                                                  letterSpacing: '1px',
                                                  boxShadow: '0 6px 16px rgba(122, 78, 165, 0.25)',
                                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  color: 'white',
                                                  cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                                                  opacity: p.stock > 0 ? 1 : 0.6
                                                }}
                                                disabled={p.stock <= 0}
                                              >
                                                <ShoppingCart size={16} /> {p.stock > 0 ? "ADD TO CART" : "OUT OF STOCK"}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No products in this category yet.</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <>
                          {col.show_category_banner !== false && col.show_category_banner !== 0 && !(col.name.toLowerCase().includes('trend') || col.name.toLowerCase().includes('trand')) && (
                            <div className="nobaraa-category-grid" style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                              justifyContent: 'center',
                              gap: '24px',
                              width: '100%',
                              margin: '0 auto 50px'
                            }}>
                              {colCategories.map(c => {
                                const defaultImg = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80";
                                const coverImg = c.image_url || defaultImg;
                                return (
                                  <div 
                                    key={c.id}
                                    className="nobaraa-category-card"
                                    onClick={() => { setActiveCategoryPage(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    style={{ 
                                      position: 'relative', 
                                      background: 'linear-gradient(to bottom, #f5edff 0%, #ecdffa 100%)',
                                      borderRadius: '20px',
                                      padding: '16px 16px 24px',
                                      cursor: 'pointer',
                                      boxShadow: '0 8px 24px rgba(122, 78, 165, 0.06)',
                                      transition: 'all 0.3s ease',
                                      border: '1px solid rgba(122, 78, 165, 0.05)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      maxWidth: '290px',
                                      width: '100%',
                                      margin: '0 auto'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-6px)';
                                      e.currentTarget.style.boxShadow = '0 15px 35px rgba(122, 78, 165, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 78, 165, 0.06)';
                                    }}
                                  >
                                    {/* Inner image container */}
                                    <div className="nobaraa-category-image-container" style={{
                                      width: '100%',
                                      height: '350px',
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}>
                                      <img 
                                        src={coverImg} 
                                        alt={c.name}
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          objectFit: 'cover',
                                          transition: 'transform 0.5s ease'
                                        }}
                                      />
                                      
                                      {/* White Circle Overlapping Icon Button */}
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        left: '50%',
                                        transform: 'translate(-50%, 50%)',
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        boxShadow: '0 4px 10px rgba(122, 78, 165, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 5
                                      }}>
                                        {getCategoryIcon(c.name)}
                                      </div>
                                    </div>

                                    {/* Label and Link details below the overlap */}
                                    <div style={{
                                      paddingTop: '28px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <span style={{ 
                                        fontFamily: "'Playfair Display', serif", 
                                        fontWeight: 700, 
                                        fontSize: '1.05rem', 
                                        color: '#2b0b57',
                                        textAlign: 'center',
                                        display: 'block'
                                      }}>
                                        {c.name}
                                      </span>
                                      <span style={{ 
                                        fontFamily: "'Jost', sans-serif", 
                                        fontWeight: 800, 
                                        fontSize: '0.72rem', 
                                        color: '#7a4ea5', 
                                        letterSpacing: '1px', 
                                        marginTop: '8px', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        textTransform: 'uppercase' 
                                      }}>
                                        Shop Now <ChevronRight size={12} />
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Saree products in this collection */}
                          <div className="product-grid animate-fade-in">
                            {displayedProducts.length > 0 ? (
                              displayedProducts.map((p, idx) => (
                                <div key={p.id} className="scroll-reveal" style={{ transitionDelay: `${(idx % 4) * 0.12}s` }}>
                                  <div className="product-card" onClick={() => handleProductSelection(p.id)}
                                  style={{ 
                                    background: '#ffffff', 
                                    borderRadius: '20px', 
                                    overflow: 'hidden', 
                                    boxShadow: '0 8px 24px rgba(122, 78, 165, 0.08)',
                                    border: '1px solid #f0e6fc',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    height: '100%'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(122, 78, 165, 0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 78, 165, 0.08)';
                                  }}
                                  >
                                    <div className={`product-image-container ${p.images[1] ? 'has-secondary' : ''}`} style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
                                      <img className="product-img primary-image" src={p.images[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease, transform 0.6s ease' }} />
                                      {p.images[1] && (
                                        <img className="product-img secondary-image" src={p.images[1]} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.6s ease, transform 0.6s ease', pointerEvents: 'none' }} />
                                      )}
                                      {p.original_price > p.price && (
                                        <div className="product-discount-tag" style={{ position: 'absolute', top: '16px', left: '16px', background: 'linear-gradient(135deg, #e84e7e 0%, #c12b5b 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 4px 10px rgba(232, 78, 126, 0.3)', zIndex: 2 }}>
                                          {Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF
                                        </div>
                                      )}
                                      <button 
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleAddToWishlist(p.id);
                                        }} 
                                        style={{ position: 'absolute', top: '16px', right: '16px', background: '#ffffff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e84e7e', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s ease', zIndex: 2 }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                      >
                                        <Heart size={18} />
                                      </button>
                                    </div>
                                    
                                    <div className="product-info" style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.75rem', color: '#7a4ea5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{p.category_name}</span>
                                      <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: '#2b0b57', marginBottom: '8px', lineHeight: 1.3 }}>{p.name}</h4>
                                      
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                                        <span className="badge badge-success" style={{ background: '#f5edff', color: '#7a4ea5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px' }}>
                                          {(4.0 + (p.id % 10) * 0.1).toFixed(1)} <Award size={12} />
                                        </span>
                                        <span style={{ color: '#666666', fontFamily: "'Jost', sans-serif" }}>({(p.id * 7 + 15)} reviews)</span>
                                      </div>

                                      <p className="product-description" style={{ fontFamily: "'Jost', sans-serif", color: '#666666', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px', flexGrow: 1 }}>{p.description}</p>
                                      
                                      <div className="price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
                                        <span className="current-price" style={{ fontFamily: "'Jost', sans-serif", color: '#2b0b57', fontSize: '1.4rem', fontWeight: 800 }}>₹{p.price.toFixed(2)}</span>
                                        {p.original_price > p.price && (
                                          <span className="original-price" style={{ textDecoration: 'line-through', fontSize: '0.9rem', color: '#999999' }}>₹{p.original_price.toFixed(2)}</span>
                                        )}
                                      </div>
                                      
                                      <button 
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleAddToCart(p.id);
                                        }} 
                                        style={{ 
                                          background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                                          border: 'none',
                                          borderRadius: '30px',
                                          padding: '12px',
                                          justifyContent: 'center', 
                                          width: '100%',
                                          fontFamily: "'Jost', sans-serif",
                                          fontWeight: 700,
                                          letterSpacing: '1px',
                                          boxShadow: '0 6px 16px rgba(122, 78, 165, 0.25)',
                                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          color: 'white',
                                          cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                                          opacity: p.stock > 0 ? 1 : 0.6
                                        }}
                                        onMouseEnter={e => {
                                          if(p.stock > 0) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(122, 78, 165, 0.3)';
                                          }
                                        }}
                                        onMouseLeave={e => {
                                          if(p.stock > 0) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(122, 78, 165, 0.25)';
                                          }
                                        }}
                                        disabled={p.stock <= 0}
                                      >
                                        <ShoppingCart size={16} /> {p.stock > 0 ? "ADD TO CART" : "OUT OF STOCK"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                                <AlertCircle size={48} style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
                                <p>No products match your current filters in this collection.</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Shop by Categories Section */}
                  {categories.length > 0 && (
                    <div style={{ marginBottom: '80px', width: '100%', position: 'relative', padding: '40px 0', overflow: 'hidden' }} className="animate-fade-in">
                      
                      {/* Leafy Corner branches */}
                      <img 
                        src="/nobaraa_flowers.png" 
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          left: isMobile ? '-12px' : '-40px', 
                          width: isMobile ? '120px' : '190px', 
                          height: 'auto', 
                          opacity: 0.6, 
                          transform: 'rotate(-45deg)', 
                          pointerEvents: 'none' 
                        }} 
                        alt="" 
                      />
                      <img 
                        src="/nobaraa_flowers.png" 
                        style={{ 
                          position: 'absolute', 
                          top: '10px', 
                          right: isMobile ? '-12px' : '-40px', 
                          width: isMobile ? '120px' : '190px', 
                          height: 'auto', 
                          opacity: 0.6, 
                          transform: 'rotate(45deg) scaleX(-1)', 
                          pointerEvents: 'none' 
                        }} 
                        alt="" 
                      />

                      {/* Header Ribbon Line & centered logo mark */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ width: '40px', height: '1px', background: '#7a4ea5', opacity: 0.4 }}></div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: '#7a4ea5', fontWeight: 'bold', fontStyle: 'italic' }}>n</span>
                        <div style={{ width: '40px', height: '1px', background: '#7a4ea5', opacity: 0.4 }}></div>
                      </div>

                      {/* Collection Header Title */}
                      <h2 style={{ 
                        fontFamily: "'Playfair Display', serif", 
                        fontSize: '2.5rem', 
                        fontWeight: 700, 
                        color: '#2b0b57', 
                        textAlign: 'center', 
                        margin: '0 auto 10px',
                        lineHeight: 1.2
                      }}>
                        Shop by <span style={{ fontFamily: "'Great Vibes', cursive", color: '#7a4ea5', fontSize: '3.2rem', display: 'inline-block', transform: 'translateY(5px)', textTransform: 'none' }}>Category</span>
                      </h2>
                      
                      {/* Subtitle */}
                      <p style={{ 
                        fontFamily: "'Jost', sans-serif", 
                        fontSize: '0.95rem', 
                        color: '#666666', 
                        textAlign: 'center', 
                        marginBottom: '40px',
                        marginTop: '-5px'
                      }}>
                        Find everything you love, all in one place.
                      </p>

                      {/* Category Grid Section styled like mockup card list */}
                      <div className="nobaraa-category-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        justifyContent: 'center',
                        gap: '24px',
                        width: '100%',
                        margin: '0 auto 50px'
                      }}>
                        {categories.map(c => {
                          const defaultImg = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80";
                          const coverImg = c.image_url || defaultImg;
                          return (
                            <div 
                              key={c.id}
                              className="nobaraa-category-card"
                              onClick={() => { setActiveCategoryPage(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              style={{ 
                                position: 'relative', 
                                background: 'linear-gradient(to bottom, #f5edff 0%, #ecdffa 100%)',
                                borderRadius: '20px',
                                padding: '16px 16px 24px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(122, 78, 165, 0.06)',
                                transition: 'all 0.3s ease',
                                border: '1px solid rgba(122, 78, 165, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                maxWidth: '290px',
                                width: '100%',
                                margin: '0 auto'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-6px)';
                                e.currentTarget.style.boxShadow = '0 15px 35px rgba(122, 78, 165, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 78, 165, 0.06)';
                              }}
                            >
                              {/* Inner image container */}
                              <div className="nobaraa-category-image-container" style={{
                                width: '100%',
                                height: '350px',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                <img 
                                  src={coverImg} 
                                  alt={c.name}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    transition: 'transform 0.5s ease'
                                  }}
                                />
                                
                                {/* White Circle Overlapping Icon Button */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: '0',
                                  left: '50%',
                                  transform: 'translate(-50%, 50%)',
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  boxShadow: '0 4px 10px rgba(122, 78, 165, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 5
                                }}>
                                  {getCategoryIcon(c.name)}
                                </div>
                              </div>

                              {/* Label and Link details below the overlap */}
                              <div style={{
                                paddingTop: '28px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ 
                                  fontFamily: "'Playfair Display', serif", 
                                  fontWeight: 700, 
                                  fontSize: '1.05rem', 
                                  color: '#2b0b57',
                                  textAlign: 'center',
                                  display: 'block'
                                }}>
                                  {c.name}
                                </span>
                                <span style={{ 
                                  fontFamily: "'Jost', sans-serif", 
                                  fontWeight: 800, 
                                  fontSize: '0.72rem', 
                                  color: '#7a4ea5', 
                                  letterSpacing: '1px', 
                                  marginTop: '8px', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px', 
                                  textTransform: 'uppercase' 
                                }}>
                                  Shop Now <ChevronRight size={12} />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product list grid */}
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.6rem', marginBottom: '20px', color: '#222222' }}>The Saree & Ethnic Collection</h3>
                  <div className="product-grid animate-fade-in">
                    {loadingProducts ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <div key={`skeleton-${idx}`} className="product-card" style={{
                          background: '#ffffff',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          boxShadow: '0 8px 24px rgba(122, 78, 165, 0.05)',
                          border: '1px solid #f0e6fc',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '520px',
                          position: 'relative'
                        }}>
                          {/* Image Placeholder */}
                          <div className="shim-bar" style={{ height: '300px', background: '#f6efff', position: 'relative' }}></div>
                          {/* Details Placeholder */}
                          <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Category tag */}
                            <div className="shim-bar" style={{ width: '35%', height: '12px', borderRadius: '4px' }}></div>
                            {/* Title */}
                            <div className="shim-bar" style={{ width: '85%', height: '22px', borderRadius: '6px' }}></div>
                            {/* Rating */}
                            <div className="shim-bar" style={{ width: '25%', height: '16px', borderRadius: '12px' }}></div>
                            {/* Description lines */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
                              <div className="shim-bar" style={{ width: '100%', height: '12px', borderRadius: '4px' }}></div>
                              <div className="shim-bar" style={{ width: '90%', height: '12px', borderRadius: '4px' }}></div>
                            </div>
                            {/* Bottom row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                              <div className="shim-bar" style={{ width: '45%', height: '24px', borderRadius: '6px' }}></div>
                              <div className="shim-bar" style={{ width: '100px', height: '36px', borderRadius: '20px' }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : products.length > 0 ? (
                      products.map((p, idx) => (
                        <div key={p.id} className="scroll-reveal" style={{ transitionDelay: `${(idx % 4) * 0.12}s` }}>
                          <div className="product-card" onClick={() => handleProductSelection(p.id)}
                          style={{ 
                            background: '#ffffff', 
                            borderRadius: '20px', 
                            overflow: 'hidden', 
                            boxShadow: '0 8px 24px rgba(122, 78, 165, 0.08)',
                            border: '1px solid #f0e6fc',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            height: '100%'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 15px 35px rgba(122, 78, 165, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(122, 78, 165, 0.08)';
                          }}
                          >
                            <div className={`product-image-container ${p.images[1] ? 'has-secondary' : ''}`} style={{ position: 'relative', height: '320px', overflow: 'hidden' }}>
                              <img className="product-img primary-image" src={p.images[0] || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease, transform 0.6s ease' }} />
                              {p.images[1] && (
                                <img className="product-img secondary-image" src={p.images[1]} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 0.6s ease, transform 0.6s ease', pointerEvents: 'none' }} />
                              )}
                              {p.original_price > p.price && (
                                <div className="product-discount-tag" style={{ position: 'absolute', top: '16px', left: '16px', background: 'linear-gradient(135deg, #e84e7e 0%, #c12b5b 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', boxShadow: '0 4px 10px rgba(232, 78, 126, 0.3)', zIndex: 2 }}>
                                  {Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF
                                </div>
                              )}
                              <button 
                                onClick={e => {
                                  e.stopPropagation();
                                  handleAddToWishlist(p.id);
                                }} 
                                style={{ position: 'absolute', top: '16px', right: '16px', background: '#ffffff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e84e7e', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s ease', zIndex: 2 }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <Heart size={18} />
                              </button>
                            </div>
                            
                            <div className="product-info" style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '0.75rem', color: '#7a4ea5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{p.category_name}</span>
                              <h4 className="product-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: '#2b0b57', marginBottom: '8px', lineHeight: 1.3 }}>{p.name}</h4>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                                <span className="badge badge-success" style={{ background: '#f5edff', color: '#7a4ea5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px' }}>
                                  {(4.0 + (p.id % 10) * 0.1).toFixed(1)} <Award size={12} />
                                </span>
                                <span style={{ color: '#666666', fontFamily: "'Jost', sans-serif" }}>({(p.id * 7 + 15)} reviews)</span>
                              </div>

                              <p className="product-description" style={{ fontFamily: "'Jost', sans-serif", color: '#666666', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px', flexGrow: 1 }}>{p.description}</p>
                              
                              <div className="price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
                                <span className="current-price" style={{ fontFamily: "'Jost', sans-serif", color: '#2b0b57', fontSize: '1.4rem', fontWeight: 800 }}>₹{p.price.toFixed(2)}</span>
                                {p.original_price > p.price && (
                                  <span className="original-price" style={{ textDecoration: 'line-through', fontSize: '0.9rem', color: '#999999' }}>₹{p.original_price.toFixed(2)}</span>
                                )}
                              </div>
                              
                              <button 
                                onClick={e => {
                                  e.stopPropagation();
                                  handleAddToCart(p.id);
                                }} 
                                style={{ 
                                  background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                                  border: 'none',
                                  borderRadius: '30px',
                                  padding: '12px',
                                  justifyContent: 'center', 
                                  width: '100%',
                                  fontFamily: "'Jost', sans-serif",
                                  fontWeight: 700,
                                  letterSpacing: '1px',
                                  boxShadow: '0 6px 16px rgba(122, 78, 165, 0.25)',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: 'white',
                                  cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                                  opacity: p.stock > 0 ? 1 : 0.6
                                }}
                                onMouseEnter={e => {
                                  if(p.stock > 0) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(122, 78, 165, 0.3)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if(p.stock > 0) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(122, 78, 165, 0.25)';
                                  }
                                }}
                                disabled={p.stock <= 0}
                              >
                                <ShoppingCart size={16} /> {p.stock > 0 ? "ADD TO CART" : "OUT OF STOCK"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                        <AlertCircle size={48} style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
                        <p>No products match your current filters. Adjust search query or range.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Flipkart-style Hero Banner Carousel */}
              {opacBanners && opacBanners.length > 0 && (
                <div className="glass-panel animate-fade-in" style={{ height: '280px', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginTop: '40px', marginBottom: '24px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <img 
                    src={opacBanners[currentSlide]?.image} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85)', cursor: 'pointer' }}
                    onClick={() => { setCurrentView("customization"); setActiveCategoryPage(null); setSelectedCategory(""); }}
                  />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7) 35%, transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', color: '#ffffff' }}>
                    <span className="badge badge-success" style={{ width: 'fit-content', background: 'var(--accent-primary)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px' }}>BOUTIQUE SPECIALS</span>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>{opacBanners[currentSlide]?.title}</h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', maxWidth: '500px', marginBottom: '20px', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{opacBanners[currentSlide]?.subtitle}</p>
                    <button className="btn-primary" onClick={() => { setCurrentView("customization"); setActiveCategoryPage(null); setSelectedCategory(""); }} style={{ width: 'fit-content', padding: '10px 24px' }}>
                      {opacBanners[currentSlide]?.actionText} <ChevronRight size={18} />
                    </button>
                  </div>
                  
                  {/* Slider Dots */}
                  <div style={{ position: 'absolute', bottom: '16px', right: '24px', display: 'flex', gap: '8px', zIndex: 10 }}>
                    {opacBanners.map((_, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setCurrentSlide(idx)}
                        style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentSlide === idx ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', transition: 'background 0.3s' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>


        {/* FEATURES BAR / WHY CHOOSE NOBARAA */}
        {currentView === 'opac' && !activeCategoryPage && <FeaturesBar isMobile={isMobile} />}

        {/* PREMIUM DEEP LUXURY NOBARAA FOOTER */}
        <footer style={{ background: '#130525', padding: '80px 80px 40px', borderTop: 'none', fontFamily: "'Jost', sans-serif", color: '#e0d1f5', position: 'relative', marginTop: '60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr', gap: '40px', marginBottom: '60px', flexWrap: 'wrap' }}>
            
            {/* COLUMN 1: LET'S GET IN TOUCH */}
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: '400', marginBottom: '16px', color: '#ffffff' }}>Stay Connected</h3>
              <p style={{ color: '#bba1d8', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6', maxWidth: '300px' }}>
                Join the Nobaraa family to receive exclusive luxury offers, early access to new collections, and 10% off your first ethnic wear order.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  style={{ width: '100%', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', borderRadius: '30px', color: '#ffffff', fontSize: '0.85rem', fontFamily: "'Jost', sans-serif", outline: 'none' }} 
                />
                <button 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', color: '#ffffff', padding: '14px 20px', border: 'none', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 6px 16px rgba(122, 78, 165, 0.25)', transition: 'transform 0.2s' }}
                  onClick={() => alert("Thank you for subscribing to our boutique newsletter! Your 10% coupon code is: NOBARAA10")}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Subscribe now
                </button>
              </div>
            </div>

            {/* COLUMN 2: QUICK LINK */}
            <div>
              <h5 style={{ fontFamily: "'Jost', sans-serif", fontWeight: '700', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', color: '#ffffff' }}>Quick Links</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {['Return and Refund Policy', 'Privacy Policy', 'Shipping Policy', 'Terms of Service', 'Contact'].map(link => (
                  <a 
                    key={link} 
                    href="#" 
                    onClick={e => {
                      e.preventDefault();
                      if (link === 'Return and Refund Policy') {
                        setShowPolicyModal(true);
                      } else if (link === 'Privacy Policy') {
                        setShowPrivacyModal(true);
                      } else if (link === 'Shipping Policy') {
                        setShowShippingModal(true);
                      } else if (link === 'Terms of Service') {
                        setShowTermsModal(true);
                      } else if (link === 'Contact') {
                        setShowContactModal(true);
                      }
                    }}
                    style={{ color: '#bba1d8', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e84e7e'}
                    onMouseLeave={e => e.currentTarget.style.color = '#bba1d8'}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* COLUMN 3: COMPANY */}
            <div>
              <h5 style={{ fontFamily: "'Jost', sans-serif", fontWeight: '700', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', color: '#ffffff' }}>Company</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {['Home', 'Shop Collections', 'Store Locator', 'About Nobaraa'].map(link => (
                  <a 
                    key={link} 
                    href="#" 
                    onClick={e => {
                      e.preventDefault();
                      if (link === 'About Nobaraa') {
                        setShowAboutModal(true);
                      }
                    }}
                    style={{ color: '#bba1d8', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e84e7e'}
                    onMouseLeave={e => e.currentTarget.style.color = '#bba1d8'}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* COLUMN 4: OUR STORE & SOCIALS */}
            <div>
              <h5 style={{ fontFamily: "'Jost', sans-serif", fontWeight: '700', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', color: '#ffffff' }}>Experience Nobaraa</h5>
              
              {/* Circular Social Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[
                  { name: 'pinterest', icon: 'P' },
                  { name: 'facebook', icon: 'f' },
                  { name: 'instagram', icon: '📸' },
                  { name: 'twitter', icon: '𝕏' },
                  { name: 'youtube', icon: '▶' }
                ].map(soc => (
                  <a 
                    key={soc.name}
                    href="#"
                    onClick={e => e.preventDefault()}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold', transition: 'all 0.3s ease', border: '1px solid rgba(255,255,255,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e84e7e'; e.currentTarget.style.borderColor = '#e84e7e'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {soc.icon}
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* BOTTOM ROW: COPYRIGHT & SCROLL TO TOP */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#886d9e', letterSpacing: '1px' }}>© NOBARAA FASHION 2026. ALL RIGHTS RESERVED.</span>
            
            {/* SCROLL TO TOP BUTTON */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(122, 78, 165, 0.4)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ↑
            </button>
          </div>
        </footer>
      </>
    )}

        {/* RENDER VIEW: CUSTOMIZATION PAGE */}
        {currentView === 'customization' && (
          <main className="main-content animate-fade-in" style={{ maxWidth: '100%', margin: '0 auto', width: '100%', padding: isMobile ? '20px 12px' : '40px 40px', minHeight: '80vh' }}>
            {/* Breadcrumb / Back Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span style={{ cursor: 'pointer', color: '#7a4ea5' }} onClick={() => setCurrentView('opac')}>Home</span>
              <span>/</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Bespoke Customization</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#2b0b57', fontWeight: 700, marginBottom: '12px' }}>Custom Tailoring & Design</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                Select a category and browse our exclusive designs. Pick a product and specify your custom color and tailoring measurements to place a bespoke order.
              </p>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setSelectedCustomCategory("")}
                style={{
                  background: selectedCustomCategory === "" ? 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)' : '#ffffff',
                  color: selectedCustomCategory === "" ? '#ffffff' : '#222222',
                  border: '1px solid ' + (selectedCustomCategory === "" ? '#7a4ea5' : 'var(--border-subtle)'),
                  padding: '10px 24px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: selectedCustomCategory === "" ? '0 4px 15px rgba(122, 78, 165, 0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                All Designs
              </button>
              {(currentShop?.categories || categories).filter(cat => cat.customization_enabled).map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCustomCategory(cat.id)}
                  style={{
                    background: selectedCustomCategory === cat.id ? 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)' : '#ffffff',
                    color: selectedCustomCategory === cat.id ? '#ffffff' : '#222222',
                    border: '1px solid ' + (selectedCustomCategory === cat.id ? '#7a4ea5' : 'var(--border-subtle)'),
                    padding: '10px 24px',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: selectedCustomCategory === cat.id ? '0 4px 15px rgba(122, 78, 165, 0.2)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
              {products.filter(p => p.customization_enabled).length > 0 ? (
                products
                  .filter(p => p.customization_enabled)
                  .filter(p => selectedCustomCategory === "" ? true : p.category_id === selectedCustomCategory)
                  .map(p => (
                    <div 
                      key={p.id} 
                      className="glass-panel"
                      onClick={() => {
                        if (role === 'guest') {
                          setLoginRoleTab("user");
                          setShowLoginModal(true);
                          addToast("Authentication Required", "Please login to place a customization order.", "info");
                        } else {
                          setCustomizingProduct(p);
                          const palette = currentShop?.color_palette || [];
                          setSelectedCustomColor(palette.length > 0 ? palette[0] : null);
                          setCustomSizingNotes("");
                          setCustomQuantity(currentShop?.customization_min_quantity || 1);
                        }
                      }}
                      style={{ borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', background: '#ffffff', transition: 'all 0.3s ease' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(122, 78, 165, 0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', overflow: 'hidden', borderRadius: '12px', background: '#fcfaff' }}>
                        <img src={p.images[0] || null} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '0 4px 8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>{p.category_name}</div>
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>{p.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2b0b57' }}>₹{p.price.toFixed(2)}</span>
                          <span className="badge badge-success" style={{ background: 'rgba(122, 78, 165, 0.08)', color: '#7a4ea5', border: '1px solid rgba(122, 78, 165, 0.15)', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '20px', fontWeight: 600 }}>Customize</span>
                        </div>
                      </div>
                    </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '16px' }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 12px', color: '#7a4ea5' }} />
                  <p>No products are currently enabled for customization by the shop administrator. Please check back later!</p>
                </div>
              )}
            </div>

            {/* Modals moved to root level */}
          </main>
        )}


      {/* RENDER VIEW 2: CUSTOMER / USER VIEW */}
      {currentView === 'user_dashboard' && role === 'user' && (
        <div className="dashboard-grid user-dashboard-grid">
          {(!isMobile || activePanel === 'menu' || !activePanel) && (
            <aside className="sidebar user-sidebar">
              <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '0 8px', borderBottom: '1px solid #eeeeee', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(154, 132, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 800, margin: 0, fontSize: '1rem', color: '#222222', fontFamily: "'Playfair Display', serif" }}>{user?.name || 'Customer'}</h5>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Customer Wallet</span>
                  </div>
                </div>
                {currentShop?.super_coin_enabled !== false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ background: '#f5f0fa', color: '#7a4ea5', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(122, 78, 165, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✨ {userDashboardData?.super_coins !== undefined ? userDashboardData.super_coins : 250} Coins
                    </div>
                  </div>
                )}
              </div>
              
              <span className={`sidebar-link ${activePanel === 'cart' ? 'active' : ''}`} onClick={() => setActivePanel("cart")}>
                <ShoppingCart size={18} /> My Active Cart ({cart.length})
              </span>
              <span className={`sidebar-link ${activePanel === 'wishlist' ? 'active' : ''}`} onClick={() => setActivePanel("wishlist")}>
                <Heart size={18} /> Wishlist ({wishlist.length})
              </span>
              <span className={`sidebar-link ${activePanel === 'orders' ? 'active' : ''}`} onClick={() => setActivePanel("orders")}>
                <ShoppingBag size={18} /> Order History
              </span>
              <span className={`sidebar-link ${activePanel === 'notifications' ? 'active' : ''}`} onClick={() => setActivePanel("notifications")}>
                <Bell size={18} /> Notifications
              </span>
              <span className={`sidebar-link ${activePanel === 'help_center' ? 'active' : ''}`} onClick={() => setActivePanel("help_center")}>
                <HelpCircle size={18} /> Support Ticket Center
              </span>
              <span className={`sidebar-link ${activePanel === 'settings' ? 'active' : ''}`} onClick={() => setActivePanel("settings")}>
                <Settings size={18} /> Account Settings
              </span>
              <span className={`sidebar-link ${activePanel === 'customizations' ? 'active' : ''}`} onClick={() => setActivePanel("customizations")}>
                <Sparkles size={18} /> Customization Requests
              </span>
              
              <div style={{ borderTop: '1px solid #eeeeee', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span className="sidebar-link" onClick={() => setCurrentView("opac")} style={{ padding: '10px 16px' }}>
                  ← Return to Storefront
                </span>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary" 
                  style={{ 
                    width: '100%', 
                    padding: '10px 16px', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f',
                    borderRadius: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </aside>
          )}
          
          {(!isMobile || (activePanel && activePanel !== 'menu')) && (
            <main className="main-content">
              {isMobile && activePanel && activePanel !== 'menu' && (
                <button 
                  onClick={() => setActivePanel("menu")} 
                  className="btn-secondary" 
                  style={{ 
                    marginBottom: '20px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '8px'
                  }}
                >
                  ← Back to Account Menu
                </button>
              )}

            {/* Shopping Cart panel */}
            {activePanel === 'cart' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Your Shopping Cart</h2>
                
                {cart.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'start' }}>
                    
                    {/* Cart Items list */}
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {cart.map(ci => (
                        <div 
                          key={ci.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '20px', 
                            borderBottom: '1px solid #f0e6fc',
                            gap: '20px',
                            flexWrap: 'wrap',
                            transition: 'all 0.2s',
                            background: '#ffffff',
                            borderRadius: '16px',
                            boxShadow: '0 4px 12px rgba(122, 78, 165, 0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
                            <div style={{ 
                              width: '74px', 
                              height: '74px', 
                              borderRadius: '12px', 
                              overflow: 'hidden', 
                              background: '#fcfbfe', 
                              border: '1px solid #f0e6fc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {ci.product.images && ci.product.images.length > 0 ? (
                                <img src={ci.product.images[0]} alt={ci.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <ShoppingBag size={24} style={{ color: '#d0bdf4' }} />
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <h4 style={{ 
                                fontWeight: 700, 
                                color: '#2b0b57', 
                                margin: 0,
                                fontSize: '1.05rem',
                                fontFamily: "'Jost', sans-serif"
                              }}>{ci.product.name}</h4>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: '#7a4ea5',
                                background: '#f5edff',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                width: 'fit-content',
                                fontWeight: 600
                              }}>Product ID: #{ci.product.id}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: '80px', textAlign: 'right' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2b0b57' }}>₹{ci.product.price}</span>
                            </div>

                            {/* MODERN QTY SELECTOR PILL */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              background: '#f5edff', 
                              borderRadius: '24px', 
                              padding: '6px 14px', 
                              border: '1px solid #e9dbf7'
                            }}>
                              <button 
                                disabled={ci.quantity <= 1}
                                onClick={() => handleAddToCart(ci.product_id, Math.max(1, ci.quantity - 1), false)}
                                style={{ 
                                  border: 'none', 
                                  background: 'none', 
                                  color: ci.quantity <= 1 ? '#cdafe9' : '#7a4ea5', 
                                  cursor: ci.quantity <= 1 ? 'not-allowed' : 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  padding: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <span style={{ 
                                fontWeight: 700, 
                                minWidth: '24px', 
                                textAlign: 'center', 
                                fontSize: '0.95rem', 
                                color: '#2b0b57' 
                              }}>{ci.quantity}</span>
                              <button 
                                disabled={ci.quantity >= ci.product.stock}
                                onClick={() => handleAddToCart(ci.product_id, Math.min(ci.product.stock, ci.quantity + 1), false)}
                                style={{ 
                                  border: 'none', 
                                  background: 'none', 
                                  color: ci.quantity >= ci.product.stock ? '#cdafe9' : '#7a4ea5', 
                                  cursor: ci.quantity >= ci.product.stock ? 'not-allowed' : 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  padding: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                            </div>

                            <button 
                              onClick={() => handleRemoveFromCart(ci.id)} 
                              style={{ 
                                background: '#ffeef2', 
                                border: 'none', 
                                color: '#e84e7e', 
                                cursor: 'pointer',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Order Summary */}
                    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', height: 'fit-content', position: 'sticky', top: '20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#2b0b57', fontFamily: 'var(--font-serif)', borderBottom: '1px solid #f0e6fc', paddingBottom: '16px' }}>Order Summary</h3>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: '1.05rem' }}>
                        <span>Items ({cart.reduce((sum, item) => sum + item.quantity, 0)}):</span>
                        <span style={{ fontWeight: 600 }}>₹{cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: '1.05rem' }}>
                        <span>Delivery:</span>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Free</span>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed #e0e0e0', margin: '8px 0' }}></div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#222' }}>Order Total:</span>
                        <span style={{ fontWeight: 800, fontSize: '1.6rem', color: '#2b0b57' }}>
                          ₹{cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                      
                      <button 
                        className="btn-primary" 
                        onClick={() => setCurrentView('checkout')}
                        style={{ padding: '16px', fontSize: '1.1rem', fontWeight: 700, justifyContent: 'center', marginTop: '16px' }}
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <ShoppingCart size={48} style={{ margin: '0 auto 12px' }} />
                    <p>Your shopping cart is currently empty. Visit the OPAC catalog page to select items.</p>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist panel */}
            {activePanel === 'wishlist' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Your Wishlist</h2>
                <div className="product-grid">
                  {wishlist.length > 0 ? (
                    wishlist.map(wi => (
                      <div key={wi.id} className="glass-panel product-card">
                        <div className="product-image-container">
                          <img className="product-img" src={wi.product.images[0] || null} alt="" />
                          <button onClick={() => handleRemoveFromWishlist(wi.id)} className="wishlist-btn-overlay active">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="product-info">
                          <h4 className="product-name">{wi.product.name}</h4>
                          <span className="current-price">₹{wi.product.price}</span>
                          <button onClick={() => handleAddToCart(wi.product.id)} className="btn-primary" style={{ marginTop: '12px', justifyContent: 'center' }}>
                            Move to Cart
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      <Heart size={48} style={{ margin: '0 auto 12px' }} />
                      <p>Your wishlist is currently empty. Tap the heart icons on products to add them here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Orders list panel */}
            {activePanel === 'orders' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(154, 132, 200, 0.15)', paddingBottom: '16px', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: '2rem', color: '#2b0b57', margin: 0 }}>Order History</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage your purchases, view invoices, and track return requests.</p>
                  </div>
                  <div style={{ borderRadius: '12px', padding: '6px 16px', background: 'rgba(154, 132, 200, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(154, 132, 200, 0.15)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {myOrders.length} {myOrders.length === 1 ? 'Order' : 'Orders'}
                  </div>
                </div>
                
                {myOrders.length > 0 ? (
                  myOrders.map(o => (
                    <div key={o.id} className="glass-panel" style={{ 
                      borderRadius: '16px', 
                      border: '1px solid rgba(154, 132, 200, 0.15)', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      background: '#ffffff',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s ease'
                    }}>
                      {/* Card Header Info */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                        background: 'linear-gradient(135deg, rgba(245, 237, 255, 0.3) 0%, rgba(255, 255, 255, 0.8) 100%)',
                        borderBottom: '1px solid #f0e6fc', 
                        padding: '18px 24px', 
                        gap: '16px', 
                        alignItems: 'center' 
                      }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Order Reference</span>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2b0b57', fontFamily: 'var(--font-serif)' }}>{getDisplayOrderNumber(o)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date Placed</span>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {o.created_at && !isNaN(new Date(o.created_at).getTime()) 
                              ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Mode</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: o.payment_method === 'COD' ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
                            {o.payment_method || 'Online / Card'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Paid Total</span>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-secondary)' }}>₹{Number(o.final_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span className={`badge ${
                            o.status === 'Customer Received' ? 'badge-success' : o.status === 'Dispatched' ? 'badge-info' : o.status === 'Accepted' ? 'badge-info' : o.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                          }`} style={{ padding: '6px 12px', borderRadius: '20px', letterSpacing: '0.5px', fontSize: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                            {o.status}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Items */}
                        <div>
                          <h6 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '12px' }}>Items Summary</h6>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {o.items && o.items.map(item => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#faf8ff', borderRadius: '10px', border: '1px solid #f3ecfb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(154, 132, 200, 0.1)', color: 'var(--accent-primary)', overflow: 'hidden', border: '1px solid #f0e6fc' }}>
                                    {item.product_image ? (
                                      <img src={item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <ShoppingBag size={18} />
                                    )}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>{item.product_name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price: ₹{Number(item.price).toFixed(2)}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <span style={{ background: 'rgba(154, 132, 200, 0.12)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>
                                    x{item.quantity}
                                  </span>
                                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', minWidth: '85px', textAlign: 'right' }}>
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Return Filing Clause */}
                        {o.status === 'Customer Received' && o.return_request_status === 'None' && (() => {
                          const orderReturnWindow = o.items && o.items.length > 0 
                            ? Math.max(...o.items.map(item => item.return_window_days ?? 7)) 
                            : 7;
                          const deliveryDateVal = o.delivered_at || o.created_at;
                          const deliveryDate = deliveryDateVal ? new Date(deliveryDateVal) : null;
                          const hasValidDeliveryDate = deliveryDate && !isNaN(deliveryDate.getTime());
                          const currentDate = new Date();
                          const elapsedDays = hasValidDeliveryDate 
                            ? Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24))
                            : 0;
                          const isExpired = hasValidDeliveryDate ? elapsedDays > orderReturnWindow : true;
                          const expiryDateStr = hasValidDeliveryDate
                            ? new Date(deliveryDate.getTime() + orderReturnWindow * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : 'N/A';

                          if (isExpired) {
                            return (
                              <div style={{ margin: 0, padding: '14px 20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <AlertCircle size={18} style={{ color: '#9ca3af' }} />
                                  <div>
                                    <h5 style={{ fontWeight: 700, color: '#4b5563', marginBottom: '2px', fontSize: '0.85rem' }}>Return Window Closed</h5>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                                      The {orderReturnWindow}-day return policy expired on {expiryDateStr}.
                                    </p>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '20px' }}>Expired</span>
                              </div>
                            );
                          } else {
                            return (
                              <div style={{ margin: 0, padding: '16px 20px', background: 'rgba(232, 78, 126, 0.03)', borderRadius: '12px', border: '1px dashed rgba(232, 78, 126, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <RotateCcw size={18} style={{ color: 'var(--accent-danger)' }} />
                                  <div>
                                    <h5 style={{ fontWeight: 700, color: '#222222', marginBottom: '2px', fontSize: '0.85rem' }}>Easy Returns Available</h5>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                      Policy window: <strong>{orderReturnWindow} days</strong>. You have <strong>{Math.max(0, orderReturnWindow - elapsedDays)} days</strong> left to file a return request (valid until {expiryDateStr}).
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setActiveReturnOrder(o)} 
                                  className="btn-danger" 
                                  style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px' }}
                                >
                                  File Return Request
                                </button>
                              </div>
                            );
                          }
                        })()}

                        {/* Active Return Status Details */}
                        {o.return_request_status !== 'None' && (
                          <div style={{ 
                            padding: '16px 20px', 
                            background: o.return_request_status === 'Approved' ? 'rgba(16, 185, 129, 0.04)' : o.return_request_status === 'Rejected' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)', 
                            borderRadius: '12px', 
                            fontSize: '0.8rem', 
                            border: `1px solid ${o.return_request_status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : o.return_request_status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            flexWrap: 'wrap', 
                            gap: '12px' 
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {o.return_request_status === 'Approved' ? (
                                <ShieldCheck size={18} style={{ color: '#10b981' }} />
                              ) : (
                                <AlertCircle size={18} style={{ color: o.return_request_status === 'Rejected' ? 'var(--accent-danger)' : '#f59e0b' }} />
                              )}
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return Request Status</span>
                                <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: o.return_request_status === 'Approved' ? '#10b981' : o.return_request_status === 'Rejected' ? 'var(--accent-danger)' : '#f59e0b' }}>
                                  {o.return_request_status}
                                </strong>
                                {o.return_reason && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', marginBottom: 0 }}>Reason: "{o.return_reason}"</p>}
                              </div>
                            </div>
                            {o.return_image_url && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verification Photo</span>
                                <img 
                                  src={o.return_image_url} 
                                  alt="Verification" 
                                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }}
                                  onClick={() => setExpandedImage(o.return_image_url)}
                                  title="Click to expand"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Logistics info */}
                        {o.tracking_info && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            padding: '12px 16px', 
                            background: 'rgba(154, 132, 200, 0.05)', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(154, 132, 200, 0.15)',
                            fontSize: '0.8rem',
                            color: 'var(--accent-primary)'
                          }}>
                            <Truck size={16} />
                            <span>Logistics Tracking: <strong style={{ fontWeight: 700 }}>{o.tracking_info}</strong></span>
                          </div>
                        )}

                        {/* Actions block */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'flex-end', 
                          alignItems: 'center', 
                          borderTop: '1px solid #f0e6fc', 
                          paddingTop: '16px', 
                          marginTop: '8px' 
                        }}>
                          {o.payment_method === 'COD' && o.status === 'Pending' ? (
                            <span style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)', fontWeight: 600 }}>
                              <Clock size={14} /> Invoice pending admin acceptance
                            </span>
                          ) : o.payment_method === 'COD' && o.status === 'Rejected' ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-danger)', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                              <X size={14} /> Order Rejected
                            </span>
                          ) : (
                            <button 
                              onClick={() => setInvoiceOrder(o)} 
                              className="btn-secondary" 
                              style={{ 
                                padding: '8px 20px', 
                                fontSize: '0.75rem', 
                                borderRadius: '6px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                borderColor: 'rgba(154, 132, 200, 0.4)',
                                color: 'var(--accent-primary)'
                              }}
                            >
                              <FileText size={14} /> View Tax Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fafafa', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                    <ShoppingBag size={48} style={{ margin: '0 auto 16px', color: 'var(--accent-primary)', opacity: 0.6 }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>No Orders Found</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>You haven't placed any orders yet. Visit the catalog to explore our latest fashion collections.</p>
                  </div>
                )}
              </div>
            )}

            {/* Notifications Feed */}
            {activePanel === 'notifications' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Notifications</h2>
                  <button 
                    onClick={async () => {
                      const res = await fetch(`${API_BASE}/user/notifications/read`, { method: 'POST', headers: getHeaders() });
                      if (res.ok) {
                        addToast("Marked Read", "All notifications cleared.", "info");
                        loadUserNotifications();
                      }
                    }} 
                    className="btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Clear Unread Bullets
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {userNotifications.length > 0 ? (
                    userNotifications.map(n => (
                      <div key={n.id} className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', background: n.is_read ? 'var(--bg-card)' : 'rgba(99,102,241,0.06)' }}>
                        <Bell style={{ color: n.is_read ? 'var(--text-muted)' : 'var(--accent-primary)' }} />
                        <div>
                          <h5 style={{ fontWeight: 800, fontSize: '0.95rem' }}>{n.title}</h5>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{n.message}</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Your notification center feed is currently clean.</p>
                  )}
                </div>
              </div>
            )}

            {/* Help Center panel */}
            {activePanel === 'help_center' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* File Ticket Form */}
                <form onSubmit={handleCreateTicket} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>Submit Support Case</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Your help request is dispatched directly to the active shop admins.</p>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Related Shop</label>
                    <select 
                      value={activeShopId} 
                      onChange={e => setActiveShopId(e.target.value)}
                    >
                      {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Subject Topic</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Delay in order delivery" 
                      value={newTicket.subject}
                      onChange={e => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                      required 
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Help Message Context</label>
                    <textarea 
                      placeholder="Please write details..." 
                      rows={3} 
                      value={newTicket.message}
                      onChange={e => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                      required 
                    />
                  </div>
                  
                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Open Support Ticket <Send size={16} />
                  </button>
                </form>

                {/* Submitted Tickets list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Your Opened Cases</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {userHelpTickets.length > 0 ? (
                      userHelpTickets.map(t => (
                        <div key={t.id} className="glass-panel" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{t.subject}</h4>
                            <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '12px' }}>{t.message}</p>
                          
                          {t.reply && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid var(--accent-success)', padding: '12px', borderRadius: '0 8px 8px 0', fontSize: '0.8rem' }}>
                              <strong>Admin reply:</strong> "{t.reply}"
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You have no open support cases currently.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Account Settings Panel */}
            {activePanel === 'settings' && (
              <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleUpdateProfile} className="glass-panel" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.8rem', fontFamily: "'Playfair Display', serif", marginBottom: '6px' }}>Account Settings</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Update your personal profile details and security credentials.</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={profileForm.name} 
                        onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Username</label>
                      <input 
                        type="text" 
                        value={user?.username || ""} 
                        disabled 
                        style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' }} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                    <input 
                      type="email" 
                      value={profileForm.email} 
                      onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contact Phone</label>
                    <input 
                      type="text" 
                      value={profileForm.contact_phone} 
                      onChange={e => setProfileForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#2b0b57', fontFamily: "'Playfair Display', serif" }}>Saved Shipping Addresses</h3>
                      <button 
                        type="button" 
                        onClick={handleAddAddress}
                        style={{
                          background: '#f3e8ff',
                          border: '1px solid #d8b4fe',
                          color: '#6b21a8',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={e => {
                          e.target.style.background = '#e9d5ff';
                        }}
                        onMouseLeave={e => {
                          e.target.style.background = '#f3e8ff';
                        }}
                      >
                        + Add Address
                      </button>
                    </div>

                    {(!profileForm.addresses || profileForm.addresses.length === 0) ? (
                      <p style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                        No shipping addresses saved yet. Click "+ Add Address" to save one.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                        {profileForm.addresses.map((addr, index) => (
                          <div 
                            key={addr.id} 
                            style={{ 
                              padding: '16px', 
                              background: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px',
                              position: 'relative',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2b0b57' }}>Address #{index + 1}</span>
                                {addr.is_default && (
                                  <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Default Address</span>
                                )}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteAddress(addr.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.target.style.background = 'rgba(220, 38, 38, 0.08)'}
                                onMouseLeave={e => e.target.style.background = 'none'}
                              >
                                Delete
                              </button>
                            </div>
                            
                            {/* Row 1: Contact Phone & Pin Code */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Contact Phone</label>
                                <input 
                                  type="text" 
                                  value={addr.phone || ""} 
                                  placeholder="+91..."
                                  onChange={e => handleAddressFieldChange(addr.id, 'phone', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem'
                                  }}
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Pin Code</label>
                                <input 
                                  type="text" 
                                  value={addr.pincode || ""} 
                                  placeholder="6-digit PIN code"
                                  onChange={e => handleAddressFieldChange(addr.id, 'pincode', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem'
                                  }}
                                  required
                                />
                              </div>
                            </div>

                            {/* Row 2: Flat, House no., Building, Company, Apartment */}
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Flat, House no., Building, Company, Apartment</label>
                              <input 
                                type="text" 
                                value={addr.flat || ""} 
                                placeholder="e.g. Flat 3B, Sunshine Apartments"
                                onChange={e => handleAddressFieldChange(addr.id, 'flat', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: '#fff',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem'
                                }}
                                required
                              />
                            </div>

                            {/* Row 3: Area, Street, Sector, Village */}
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Area, Street, Sector, Village</label>
                              <input 
                                type="text" 
                                value={addr.area || ""} 
                                placeholder="e.g. MG Road, Sector 4"
                                onChange={e => handleAddressFieldChange(addr.id, 'area', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: '#fff',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem'
                                }}
                                required
                              />
                            </div>

                            {/* Row 4: Landmark (Optional) */}
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Landmark (Optional)</label>
                              <input 
                                type="text" 
                                value={addr.landmark || ""} 
                                placeholder="e.g. Near Apollo Hospital"
                                onChange={e => handleAddressFieldChange(addr.id, 'landmark', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: '#fff',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: '6px',
                                  fontSize: '0.9rem'
                                }}
                              />
                            </div>

                            {/* Row 5: Town/City & State */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Town/City</label>
                                <input 
                                  type="text" 
                                  value={addr.city || ""} 
                                  placeholder="e.g. Mumbai"
                                  onChange={e => handleAddressFieldChange(addr.id, 'city', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem'
                                  }}
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>State</label>
                                <select 
                                  value={addr.state || ""} 
                                  onChange={e => handleAddressFieldChange(addr.id, 'state', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem'
                                  }}
                                  required
                                >
                                  <option value="">Select State</option>
                                  {INDIAN_STATES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Row 6: Address Type Buttons */}
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Address Type</label>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                {['House', 'Apartment', 'Business', 'Other'].map(type => (
                                  <button
                                    type="button"
                                    key={type}
                                    onClick={() => {
                                      handleAddressFieldChange(addr.id, 'address_type', type);
                                      handleAddressFieldChange(addr.id, 'label', type);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      border: addr.address_type === type ? '2px solid #7a4ea5' : '1px solid #cbd5e1',
                                      background: addr.address_type === type ? '#f5eefb' : '#fff',
                                      color: addr.address_type === type ? '#7a4ea5' : '#475569',
                                      fontWeight: '600',
                                      fontSize: '0.85rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Row 7: Set as default address */}
                            {!addr.is_default && (
                              <div style={{ marginTop: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                                  <input 
                                    type="checkbox"
                                    checked={addr.is_default || false}
                                    onChange={e => handleAddressFieldChange(addr.id, 'is_default', e.target.checked)}
                                  />
                                  Set as default address
                                </label>
                              </div>
                            )}

                            {/* Row 8: Optional Delivery Instructions */}
                            <div>
                              <button
                                type="button"
                                onClick={() => handleAddressFieldChange(addr.id, 'deliveryInstructionsExpanded', !addr.deliveryInstructionsExpanded)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#7a4ea5',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {addr.deliveryInstructionsExpanded ? 'Hide Delivery Instructions' : '+ Add Delivery Instructions'}
                              </button>
                              {addr.deliveryInstructionsExpanded && (
                                <textarea
                                  rows={2}
                                  placeholder="e.g. Leave with security, ring bell, deliver after 4 PM..."
                                  value={addr.delivery_instructions || ""}
                                  onChange={e => handleAddressFieldChange(addr.id, 'delivery_instructions', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#fff',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    marginTop: '6px',
                                    resize: 'vertical'
                                  }}
                                />
                              )}
                            </div>

                            {/* Hidden full concatenated address preview for development/debugging */}
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                              <strong>Address Preview:</strong> {addr.address || "(empty)"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Change Password (leave empty to keep current)</label>
                    <input 
                      type="password" 
                      placeholder="New Secure Password" 
                      value={profileForm.password} 
                      onChange={e => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
                    Save Account Settings
                  </button>
                </form>
              </div>
            )}

            {activePanel === 'customizations' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Bespoke Customizations</h2>
                
                <div className="responsive-table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Product Info</th>
                        <th>Selected Color</th>
                        <th>Measurements / Sizing Notes</th>
                        <th>Quantity</th>
                        <th>Pricing / Quote</th>
                        <th>Status</th>
                        <th>Date Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userCustomizations.map(cust => (
                        <tr key={cust.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{getDisplayCustomizationNumber(cust)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={cust.product_image || null} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                              <span style={{ fontWeight: 600 }}>{cust.product_name}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: '#f5edff', fontSize: '0.75rem', fontWeight: 600 }}>
                              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: cust.selected_color_hex }} />
                              {cust.selected_color_name}
                            </span>
                          </td>
                          <td>
                            <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{cust.customization_notes}</pre>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {cust.quantity || 1}
                          </td>
                          <td>
                            {(!cust.quote_status || cust.quote_status === 'Pending') && (
                              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Awaiting Quote</span>
                            )}
                            {cust.quote_status === 'Quoted' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: '#7a4ea5', fontSize: '0.95rem' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                  <button
                                    onClick={() => {
                                      setActiveCustomizationCheckout(cust);
                                      setCurrentView('checkout');
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: '#10b981', color: '#fff', fontWeight: 600 }}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleQuoteAction(cust.id, 'reject')}
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontWeight: 600 }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                            {cust.quote_status === 'Accepted' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>✓ Accepted</span>
                              </div>
                            )}
                            {cust.quote_status === 'Rejected' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.95rem', textDecoration: 'line-through' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textDecoration: 'line-through' }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>✗ Rejected</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              background: cust.status === 'Completed' ? 'rgba(154, 132, 200, 0.15)' : cust.status === 'Rejected' ? 'rgba(232, 78, 126, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                              color: cust.status === 'Completed' ? '#7a4ea5' : cust.status === 'Rejected' ? '#e84e7e' : '#b45309',
                              border: '1px solid ' + (cust.status === 'Completed' ? 'rgba(154, 132, 200, 0.3)' : cust.status === 'Rejected' ? 'rgba(232, 78, 126, 0.25)' : 'rgba(251, 191, 36, 0.25)')
                            }}>
                              {cust.status}
                            </span>
                          </td>
                          <td>{new Date(cust.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {userCustomizations.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>You haven't requested any custom designs yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </main>
          )}
        </div>
      )}

      {/* RENDER VIEW 3: STORE ADMIN VIEW */}
      {currentView === 'admin_dashboard' && role === 'admin' && (
        <div className="dashboard-grid">
          <aside className="sidebar">
            <div className="sidebar-header" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', padding: '0 8px' }}>
              <Settings style={{ color: 'var(--accent-secondary)' }} />
              <div>
                <h5 style={{ fontWeight: 800 }}>Store Admin</h5>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fulfillment Center</span>
              </div>
            </div>

            <span className={`sidebar-link ${activePanel === 'shop_config' ? 'active' : ''}`} onClick={() => setActivePanel("shop_config")}>
              <Settings size={18} /> Shop Branding Config
            </span>
            <span className={`sidebar-link ${activePanel === 'categories' ? 'active' : ''}`} onClick={() => setActivePanel("categories")}>
              <Plus size={18} /> Categories Manager
            </span>
            <span className={`sidebar-link ${activePanel === 'collections' ? 'active' : ''}`} onClick={() => setActivePanel("collections")}>
              <Award size={18} /> Collections Manager
            </span>
            <span className={`sidebar-link ${activePanel === 'products' ? 'active' : ''}`} onClick={() => setActivePanel("products")}>
              <ShoppingBag size={18} /> Product Catalog
            </span>
            <span className={`sidebar-link ${activePanel === 'orders' ? 'active' : ''}`} onClick={() => setActivePanel("orders")}>
              <ShoppingCart size={18} /> Orders & Returns
            </span>
            <span className={`sidebar-link ${activePanel === 'inventory' ? 'active' : ''}`} onClick={() => setActivePanel("inventory")}>
              <AlertCircle size={18} /> Stock Alerts
            </span>
            <span className={`sidebar-link ${activePanel === 'revenue' ? 'active' : ''}`} onClick={() => setActivePanel("revenue")}>
              <BarChart2 size={18} /> Graphical Revenue
            </span>
            <span className={`sidebar-link ${activePanel === 'popup_ads' ? 'active' : ''}`} onClick={() => setActivePanel("popup_ads")}>
              <Sparkles size={18} /> Popup Ad Banners
            </span>
            <span className={`sidebar-link ${activePanel === 'coupons' ? 'active' : ''}`} onClick={() => setActivePanel("coupons")}>
              <Percent size={18} /> Coupons & Promo Codes
            </span>
            <span className={`sidebar-link ${activePanel === 'help_center' ? 'active' : ''}`} onClick={() => setActivePanel("help_center")}>
              <HelpCircle size={18} /> Customer Support
            </span>
            <span className={`sidebar-link ${activePanel === 'messaging' ? 'active' : ''}`} onClick={() => setActivePanel("messaging")}>
              <Phone size={18} /> Fast2SMS & WhatsApp
            </span>
            <span className={`sidebar-link ${activePanel === 'gst_report' ? 'active' : ''}`} onClick={() => setActivePanel("gst_report")}>
              <FileText size={18} /> GST Accounting
            </span>
            <span className={`sidebar-link ${activePanel === 'customers' ? 'active' : ''}`} onClick={() => setActivePanel("customers")}>
              <User size={18} /> Customer List
            </span>
            <span className={`sidebar-link ${activePanel === 'customizations' ? 'active' : ''}`} onClick={() => setActivePanel("customizations")}>
              <Sparkles size={18} /> Customization Orders
            </span>
            <span className={`sidebar-link ${activePanel === 'logs' ? 'active' : ''}`} onClick={() => setActivePanel("logs")}>
              <FileText size={18} /> Store Audit Trail
            </span>
            <span className={`sidebar-link ${activePanel === 'billing_heartbeat' ? 'active' : ''}`} onClick={() => setActivePanel("billing_heartbeat")}>
              <ShieldCheck size={18} /> Billing Heartbeat
            </span>
            <span className="sidebar-link logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </span>
          </aside>

          <main className="main-content">
            
            {/* Shop Config panel */}
            {activePanel === 'shop_config' && adminShop && (
              <form onSubmit={handleUpdateAdminShop} className="glass-panel animate-fade-in admin-config-form">
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>Shop Branding & API Configurations</h2>
                
                <div className="admin-grid-2col">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shop Name Title</label>
                    <input 
                      type="text" 
                      value={adminShop.name}
                      onChange={e => setAdminShop(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Logo Image</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {adminShop.logo_url && (
                        <img src={adminShop.logo_url} alt="Logo Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        style={{ border: 'none', padding: '4px 0', cursor: 'pointer' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadFile(file, (url) => {
                              setAdminShop(prev => ({ ...prev, logo_url: url }));
                            });
                          }
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="Image path URL (automatically filled after upload)"
                        value={adminShop.logo_url}
                        onChange={e => setAdminShop(prev => ({ ...prev, logo_url: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-grid-2col">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contact Email</label>
                    <input 
                      type="email" 
                      value={adminShop.contact_email}
                      onChange={e => setAdminShop(prev => ({ ...prev, contact_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contact Phone</label>
                    <input 
                      type="text" 
                      value={adminShop.contact_phone}
                      onChange={e => setAdminShop(prev => ({ ...prev, contact_phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Privacy Policy content</label>
                  <textarea 
                    value={adminShop.privacy_policy}
                    onChange={e => setAdminShop(prev => ({ ...prev, privacy_policy: e.target.value }))}
                    rows={4} 
                  />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shop Address (Displayed on Tax Invoices)</label>
                  <textarea 
                    placeholder="Enter physical shop address to show in customer tax invoices"
                    value={adminShop.address || ""}
                    onChange={e => setAdminShop(prev => ({ ...prev, address: e.target.value }))}
                    rows={3} 
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '16px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '12px' }}>Tax & GST Configuration</h4>
                  <div className="admin-grid-2col">
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>GST Tax Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="18.0"
                        value={adminShop.gst_percentage !== undefined && adminShop.gst_percentage !== null ? adminShop.gst_percentage : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? 0.0 : parseFloat(e.target.value);
                          setAdminShop(prev => ({ ...prev, gst_percentage: val }));
                        }}
                        required
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        This rate is applied dynamically during user checkout and for GST taxation reporting.
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>GST Type</label>
                      <select 
                        value={adminShop.gst_inclusive ? 'inclusive' : 'exclusive'}
                        onChange={e => setAdminShop(prev => ({ ...prev, gst_inclusive: e.target.value === 'inclusive' }))}
                      >
                        <option value="exclusive">Exclusive (Added at checkout)</option>
                        <option value="inclusive">Inclusive (Calculated automatically from price)</option>
                      </select>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Choose whether GST is added on top of the subtotal or calculated from it.
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '16px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '12px', color: '#7a4ea5' }}>Shipping Charges Configuration</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="shipping_enabled"
                        checked={!!adminShop.shipping_enabled}
                        onChange={e => setAdminShop(prev => ({ ...prev, shipping_enabled: e.target.checked }))}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="shipping_enabled" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                        Enable Shipping Charges
                      </label>
                    </div>

                    {adminShop.shipping_enabled && (
                      <div className="animate-fade-in admin-grid-2col" style={{ background: 'rgba(122, 78, 165, 0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(122, 78, 165, 0.1)', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shipping Charges Type</label>
                          <select 
                            value={adminShop.shipping_charges_type || 'flat'}
                            onChange={e => setAdminShop(prev => ({ ...prev, shipping_charges_type: e.target.value }))}
                          >
                            <option value="flat">Flat Rate (Applied to full order)</option>
                            <option value="section">Section-Based (Per Category)</option>
                          </select>
                        </div>
                        <div>
                          {adminShop.shipping_charges_type === 'flat' ? (
                            <>
                              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Flat Rate Amount (₹)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={adminShop.shipping_charges_flat !== undefined && adminShop.shipping_charges_flat !== null ? adminShop.shipping_charges_flat : ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? 0.0 : parseFloat(e.target.value);
                                  setAdminShop(prev => ({ ...prev, shipping_charges_flat: val }));
                                }}
                                required={adminShop.shipping_charges_type === 'flat'}
                              />
                              {adminShop.shipping_charges_flat > 0 && (() => {
                                const rate = adminShop.gst_percentage || 18.0;
                                const gstAmt = (adminShop.shipping_charges_flat * (rate / 100)) / (1 + (rate / 100));
                                const taxable = adminShop.shipping_charges_flat - gstAmt;
                                return (
                                  <span style={{ fontSize: '0.75rem', color: '#7a4ea5', marginTop: '6px', display: 'block', fontWeight: 600 }}>
                                    Inclusive GST: ₹{gstAmt.toFixed(2)} (Taxable: ₹{taxable.toFixed(2)}, GST ({rate}%): ₹{gstAmt.toFixed(2)})
                                  </span>
                                );
                              })()}
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Configure rates in the <strong>Categories Manager</strong> page. Each section/category will have its own individual shipping fee.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '12px' }}>API Gateway Credentials</h4>
                  <div className="admin-grid-2col">
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Razorpay Key ID</label>
                      <input 
                        type="text" 
                        placeholder="rzp_test..."
                        value={adminShop.razorpay_key_id}
                        onChange={e => setAdminShop(prev => ({ ...prev, razorpay_key_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Razorpay Secret Key</label>
                      <input 
                        type="password" 
                        placeholder="Razorpay password secret..."
                        value={adminShop.razorpay_key_secret}
                        onChange={e => setAdminShop(prev => ({ ...prev, razorpay_key_secret: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-grid-2col">
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Fast2SMS platform API Key</label>
                    <input 
                      type="text" 
                      value={adminShop.sms_api_key}
                      onChange={e => setAdminShop(prev => ({ ...prev, sms_api_key: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>WhatsApp Campaign API Secret</label>
                    <input 
                      type="password" 
                      value={adminShop.whatsapp_api_key}
                      onChange={e => setAdminShop(prev => ({ ...prev, whatsapp_api_key: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '20px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px', color: '#7a4ea5' }}>DTDC Courier Integration</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Configure your DTDC Direct API credentials to book shipments and print routing labels directly. If left blank, mock label routing will be used.
                  </p>
                  <div className="admin-grid-2col">
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>DTDC Client Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GL001"
                        value={adminShop.dtdc_client_code || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, dtdc_client_code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>DTDC API Key</label>
                      <input 
                        type="password" 
                        placeholder="DTDC API Key..."
                        value={adminShop.dtdc_api_key || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, dtdc_api_key: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>DTDC API URL</label>
                    <input 
                      type="text" 
                      placeholder="https://api.dtdc.com/v1/shipments"
                      value={adminShop.dtdc_api_url || ""}
                      onChange={e => setAdminShop(prev => ({ ...prev, dtdc_api_url: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '20px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '12px' }}>Desktop POS Billing App Integration</h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Billing API Key</label>
                      <input 
                        type="text" 
                        placeholder="Generate an API key for your desktop app..."
                        value={adminShop.billing_api_key || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, billing_api_key: e.target.value }))}
                        style={{ fontFamily: 'monospace', height: '38px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        let randStr = '';
                        for (let i = 0; i < 24; i++) {
                          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        const newKey = 'BILLING_' + randStr;
                        setAdminShop(prev => ({ ...prev, billing_api_key: newKey }));
                      }}
                      className="btn-secondary"
                      style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap', border: '1px solid #7a4ea5', color: '#7a4ea5' }}
                    >
                      Generate API Key
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                    Copy this key and paste it in your desktop billing application's settings to sync orders, stock, and customers.
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', marginTop: '10px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px', color: '#7a4ea5' }}>Hero Section Slider & Cards</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Customize the images, titles, and descriptions of the card overlay floating alongside the model showcase in the header.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {(adminShop.saree_models || [
                      { id: 1, image: "/nobaraa_saree_model_1.png?v=2", name: "Royal Purple Saree", description: "Intricate gold zari borders woven on rich premium silk." },
                      { id: 2, image: "/nobaraa_saree_model_2.png?v=2", name: "Cream & Gold Banarasi", description: "Timeless luxury heritage weave from Varanasi." },
                      { id: 3, image: "/nobaraa_saree_model_3.png?v=2", name: "Kanjeevaram Magenta", description: "Vibrant royal pink and gold Kanjeevaram silk." }
                    ]).map((model, index, arr) => (
                      <div 
                        key={model.id || index} 
                        className="admin-model-item"
                      >
                        {/* Image Preview */}
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                          <img 
                            src={model.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=100&q=80"} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=100&q=80"; }}
                          />
                        </div>

                        {/* Card Title */}
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Card Text/Title</label>
                          <input 
                            type="text" 
                            value={model.name || ""} 
                            onChange={(e) => {
                              const updated = [...(adminShop.saree_models || arr)];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            placeholder="e.g. Royal Purple Saree"
                            style={{ padding: '8px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>

                        {/* Image URL */}
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Image Path / URL</label>
                          <input 
                            type="text" 
                            value={model.image || ""} 
                            onChange={(e) => {
                              const updated = [...(adminShop.saree_models || arr)];
                              updated[index] = { ...updated[index], image: e.target.value };
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            placeholder="e.g. /nobaraa_saree_model_1.png"
                            style={{ padding: '8px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>

                        {/* Card Description */}
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Card Description</label>
                          <input 
                            type="text" 
                            value={model.description || ""} 
                            onChange={(e) => {
                              const updated = [...(adminShop.saree_models || arr)];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            placeholder="Short description..."
                            style={{ padding: '8px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>

                        {/* Control Actions */}
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            disabled={index === 0}
                            onClick={() => {
                              const updated = [...(adminShop.saree_models || arr)];
                              const temp = updated[index];
                              updated[index] = updated[index - 1];
                              updated[index - 1] = temp;
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            disabled={index === (adminShop.saree_models || arr).length - 1}
                            onClick={() => {
                              const updated = [...(adminShop.saree_models || arr)];
                              const temp = updated[index];
                              updated[index] = updated[index + 1];
                              updated[index + 1] = temp;
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#ff4d4f', border: '1px solid #ff4d4f' }}
                            onClick={() => {
                              const updated = (adminShop.saree_models || arr).filter((_, i) => i !== index);
                              setAdminShop(prev => ({ ...prev, saree_models: updated }));
                            }}
                            title="Delete Card"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const currentList = adminShop.saree_models || [
                        { id: 1, image: "/nobaraa_saree_model_1.png?v=2", name: "Royal Purple Saree", description: "Intricate gold zari borders woven on rich premium silk." },
                        { id: 2, image: "/nobaraa_saree_model_2.png?v=2", name: "Cream & Gold Banarasi", description: "Timeless luxury heritage weave from Varanasi." },
                        { id: 3, image: "/nobaraa_saree_model_3.png?v=2", name: "Kanjeevaram Magenta", description: "Vibrant royal pink and gold Kanjeevaram silk." }
                      ];
                      const newId = currentList.length > 0 ? Math.max(...currentList.map(m => m.id || 0)) + 1 : 1;
                      const newItem = {
                        id: newId,
                        image: "/nobaraa_saree_model_1.png?v=2",
                        name: "New Saree Design",
                        description: "Premium handcrafted silk saree design."
                      };
                      setAdminShop(prev => ({ ...prev, saree_models: [...currentList, newItem] }));
                    }}
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7a4ea5', border: '1px solid rgba(122, 78, 165, 0.3)', marginBottom: '24px' }}
                  >
                    <Plus size={14} /> Add Saree Slider Card
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px', marginTop: '10px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px', color: '#7a4ea5' }}>OPAC Hero Section Carousel Banners</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Customize the background images, titles, subtitle text, and action button labels for the main customer page carousel.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {(adminShop.banners || [
                      {
                        id: 1,
                        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
                        title: "THE HEIRLOOM HERITAGE",
                        subtitle: "Meticulous Handloom Artistry, Exquisite Silk Weaves & Royal Zari Borders.",
                        actionText: "Explore Pure Silks"
                      },
                      {
                        id: 2,
                        image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=80",
                        title: "FESTIVE SOIRÉE DRESSES",
                        subtitle: "Drape Yourself in Timeless Grace with Contemporary Designer Georgettes.",
                        actionText: "Shop Georgettes"
                      },
                      {
                        id: 3,
                        image: "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=80",
                        title: "NOBARAA PRIVILEGE FEST",
                        subtitle: "Earn SuperCoins & Redeem Up to 30% Extra Savings on Every Elegant Drape.",
                        actionText: "View Wallet"
                      }
                    ]).map((banner, index, arr) => (
                      <div 
                        key={banner.id || index} 
                        className="admin-model-item"
                      >
                        {/* Image Preview & Upload */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#fff' }}>
                            <img 
                              src={banner.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80"} 
                              alt="" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80"; }}
                            />
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            id={`banner-file-${index}`}
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files[0];
                              if (file) {
                                handleUploadFile(file, (url) => {
                                  const updated = [...(adminShop.banners || arr)];
                                  updated[index] = { ...updated[index], image: url };
                                  setAdminShop(prev => ({ ...prev, banners: updated }));
                                });
                              }
                            }}
                          />
                          <button 
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: 'auto', height: 'auto' }}
                            onClick={() => document.getElementById(`banner-file-${index}`).click()}
                          >
                            Upload
                          </button>
                        </div>

                        {/* Title & Button Text */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Banner Title</label>
                            <input 
                              type="text" 
                              value={banner.title || ""} 
                              onChange={(e) => {
                                const updated = [...(adminShop.banners || arr)];
                                updated[index] = { ...updated[index], title: e.target.value };
                                setAdminShop(prev => ({ ...prev, banners: updated }));
                              }}
                              placeholder="Banner Title"
                              style={{ padding: '6px', fontSize: '0.8rem', width: '100%' }}
                              required
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Button Text</label>
                            <input 
                              type="text" 
                              value={banner.actionText || ""} 
                              onChange={(e) => {
                                const updated = [...(adminShop.banners || arr)];
                                updated[index] = { ...updated[index], actionText: e.target.value };
                                setAdminShop(prev => ({ ...prev, banners: updated }));
                              }}
                              placeholder="Button Text"
                              style={{ padding: '6px', fontSize: '0.8rem', width: '100%' }}
                              required
                            />
                          </div>
                        </div>

                        {/* Image URL */}
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Image Path / URL</label>
                          <textarea 
                            value={banner.image || ""} 
                            onChange={(e) => {
                              const updated = [...(adminShop.banners || arr)];
                              updated[index] = { ...updated[index], image: e.target.value };
                              setAdminShop(prev => ({ ...prev, banners: updated }));
                            }}
                            placeholder="Image URL..."
                            style={{ padding: '8px', fontSize: '0.8rem', width: '100%', minHeight: '60px', resize: 'vertical' }}
                            required
                          />
                        </div>

                        {/* Subtitle / Description text */}
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Text / Subtitle</label>
                          <textarea 
                            value={banner.subtitle || ""} 
                            onChange={(e) => {
                              const updated = [...(adminShop.banners || arr)];
                              updated[index] = { ...updated[index], subtitle: e.target.value };
                              setAdminShop(prev => ({ ...prev, banners: updated }));
                            }}
                            placeholder="Subtitle text..."
                            style={{ padding: '8px', fontSize: '0.8rem', width: '100%', minHeight: '60px', resize: 'vertical' }}
                            required
                          />
                        </div>

                        {/* Control Actions */}
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            disabled={index === 0}
                            onClick={() => {
                              const updated = [...(adminShop.banners || arr)];
                              const temp = updated[index];
                              updated[index] = updated[index - 1];
                              updated[index - 1] = temp;
                              setAdminShop(prev => ({ ...prev, banners: updated }));
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            disabled={index === (adminShop.banners || arr).length - 1}
                            onClick={() => {
                              const updated = [...(adminShop.banners || arr)];
                              const temp = updated[index];
                              updated[index] = updated[index + 1];
                              updated[index + 1] = temp;
                              setAdminShop(prev => ({ ...prev, banners: updated }));
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#ff4d4f', border: '1px solid #ff4d4f' }}
                            onClick={() => {
                              const updated = (adminShop.banners || arr).filter((_, i) => i !== index);
                              setAdminShop(prev => ({ ...prev, banners: updated }));
                            }}
                            title="Delete Banner"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const currentList = adminShop.banners || [
                        {
                          id: 1,
                          image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
                          title: "THE HEIRLOOM HERITAGE",
                          subtitle: "Meticulous Handloom Artistry, Exquisite Silk Weaves & Royal Zari Borders.",
                          actionText: "Explore Pure Silks"
                        },
                        {
                          id: 2,
                          image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=80",
                          title: "FESTIVE SOIRÉE DRESSES",
                          subtitle: "Drape Yourself in Timeless Grace with Contemporary Designer Georgettes.",
                          actionText: "Shop Georgettes"
                        },
                        {
                          id: 3,
                          image: "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=80",
                          title: "NOBARAA PRIVILEGE FEST",
                          subtitle: "Earn SuperCoins & Redeem Up to 30% Extra Savings on Every Elegant Drape.",
                          actionText: "View Wallet"
                        }
                      ];
                      const newId = currentList.length > 0 ? Math.max(...currentList.map(b => b.id || 0)) + 1 : 1;
                      const newItem = {
                        id: newId,
                        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
                        title: "New Hero Banner",
                        subtitle: "Luxury design, intricate embroideries & custom fabrics.",
                        actionText: "Explore Now"
                      };
                      setAdminShop(prev => ({ ...prev, banners: [...currentList, newItem] }));
                    }}
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7a4ea5', border: '1px solid rgba(122, 78, 165, 0.3)', marginBottom: '24px' }}
                  >
                    <Plus size={14} /> Add Hero Banner
                  </button>
                </div>

                {/* SMTP Email Settings Section */}
                <div style={{ borderTop: '2px solid rgba(122, 78, 165, 0.15)', paddingTop: '24px', marginTop: '20px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px', color: '#7a4ea5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={20} /> SMTP Mail Server Integration
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Configure the custom SMTP email server for triggering system alerts, transactional checkout receipts, OTP verification codes, and security login notifications.
                  </p>
                  
                  <div className="admin-grid-2col" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SMTP Host Server</label>
                      <input 
                        type="text" 
                        placeholder="e.g. smtp.gmail.com or smtp.mailtrap.io"
                        value={adminShop.smtp_host || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, smtp_host: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SMTP Port Number</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 587 or 465"
                        value={adminShop.smtp_port || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, smtp_port: e.target.value ? parseInt(e.target.value) : "" }))}
                      />
                    </div>
                  </div>

                  <div className="admin-grid-2col" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SMTP Username / User Email</label>
                      <input 
                        type="text" 
                        placeholder="e.g. your-email@gmail.com"
                        value={adminShop.smtp_user || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, smtp_user: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SMTP Password / App Secret</label>
                      <input 
                        type="password" 
                        placeholder="••••••••••••••••"
                        value={adminShop.smtp_password || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, smtp_password: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="admin-grid-2col" style={{ marginBottom: '24px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Default Sender Display Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Nobaraa Customer Support"
                        value={adminShop.smtp_sender_name || ""}
                        onChange={e => setAdminShop(prev => ({ ...prev, smtp_sender_name: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
                      <label style={{ fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none', marginTop: '24px' }}>
                        <input 
                          type="checkbox" 
                          checked={!!adminShop.smtp_use_tls}
                          onChange={e => setAdminShop(prev => ({ ...prev, smtp_use_tls: e.target.checked }))}
                          style={{ width: '18px', height: '18px', accentColor: '#7a4ea5' }}
                        />
                        Secure Server Connection (Use STARTTLS / SSL)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live SMTP Settings Test Utility */}
                <div style={{ backgroundColor: 'rgba(122, 78, 165, 0.05)', borderRadius: '12px', padding: '16px', border: '1px dashed rgba(122, 78, 165, 0.25)', marginBottom: '30px' }}>
                  <h5 style={{ fontWeight: 700, marginBottom: '8px', color: '#2b0b57' }}>SMTP Server Integration Tester</h5>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Verify credentials and active mail transport. Send a direct sample notification to any target mailbox.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recipient Mailbox</label>
                      <input 
                        type="email" 
                        placeholder="recipient@example.com"
                        value={testRecipient}
                        onChange={e => setTestRecipient(e.target.value)}
                        style={{ height: '38px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ minWidth: '150px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Test Template Theme</label>
                      <select 
                        value={testTemplateType}
                        onChange={e => setTestTemplateType(e.target.value)}
                        style={{ height: '38px', fontSize: '0.85rem', padding: '0 8px' }}
                      >
                        <option value="otp">OTP Verification Code</option>
                        <option value="forgot_password">Password Recovery Code</option>
                        <option value="purchase">Order Receipt Confirmation</option>
                        <option value="login">Account Access Alert</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail}
                      className="btn-secondary"
                      style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap', border: '1px solid #7a4ea5', color: '#7a4ea5' }}
                    >
                      {sendingTestEmail ? "Sending..." : "Trigger Test Email"} <Send size={14} />
                    </button>
                  </div>
                </div>

                {/* Email Templates Customization Panel */}
                <div style={{ borderTop: '2px solid rgba(122, 78, 165, 0.15)', paddingTop: '24px', marginBottom: '30px' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '6px', color: '#7a4ea5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} /> Customizable Transactional Email Templates
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Alter layout structures, custom greetings, and brand footnotes for notifications. Insert specified badges inside brackets to replace dynamically.
                  </p>
                  
                  {/* Select template type */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                    {[
                      { key: 'otp', label: 'OTP Code' },
                      { key: 'forgot_password', label: 'Forgot Password' },
                      { key: 'purchase', label: 'Purchase Confirmation' },
                      { key: 'login', label: 'Login Alert' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSelectedTemplateKey(tab.key)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedTemplateKey === tab.key ? '#7a4ea5' : 'rgba(122,78,165,0.06)',
                          color: selectedTemplateKey === tab.key ? '#fff' : '#7a4ea5',
                          fontWeight: selectedTemplateKey === tab.key ? 700 : 500,
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Edit Template Form */}
                  <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email Subject Line</label>
                      <input 
                        type="text" 
                        value={adminShop.email_templates?.[selectedTemplateKey]?.subject || ""}
                        onChange={e => handleTemplateChange("subject", e.target.value)}
                        placeholder="Subject Line"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email HTML/Text Body Content</label>
                      <textarea 
                        value={adminShop.email_templates?.[selectedTemplateKey]?.body || ""}
                        onChange={e => handleTemplateChange("body", e.target.value)}
                        placeholder="Email Body Content"
                        rows={8}
                        required
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }}
                      />
                    </div>

                    {/* Placeholder Guide Badges */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        Supported Dynamic Placeholders:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#d0bdf4', color: '#2b0b57', borderRadius: '6px', fontWeight: 600 }}>{"{shop_name}"}</span>
                        <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#d0bdf4', color: '#2b0b57', borderRadius: '6px', fontWeight: 600 }}>{"{name}"}</span>
                        {selectedTemplateKey === 'otp' && (
                          <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{otp}"}</span>
                        )}
                        {selectedTemplateKey === 'forgot_password' && (
                          <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{reset_link}"}</span>
                        )}
                        {selectedTemplateKey === 'purchase' && (
                          <>
                            <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{order_id}"}</span>
                            <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{total_amount}"}</span>
                            <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{items}"}</span>
                          </>
                        )}
                        {selectedTemplateKey === 'login' && (
                          <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e8dbfc', color: '#7a4ea5', borderRadius: '6px', fontWeight: 700 }}>{"{time}"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>
                  Save Shop System Configurations <Check size={18} />
                </button>
              </form>
            )}

            {/* Billing Heartbeat panel */}
            {activePanel === 'billing_heartbeat' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '20px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.6rem', marginBottom: '8px' }}>Billing Desktop Heartbeat</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Shows whether the Billing Desktop is currently online and when it was last seen.</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 8, background: billingStatus && billingStatus.is_online ? '#22c55e' : '#ef4444' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{billingStatus && billingStatus.is_online ? 'Online' : (billingStatus && billingStatus.error ? 'Error' : 'Offline')}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{billingStatus && billingStatus.last_seen_at ? `Last seen: ${billingStatus.last_seen_at}` : (billingStatus && billingStatus.error ? billingStatus.error : 'Last seen: N/A')}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={loadBillingHeartbeat} style={{ marginRight: 8 }}>Refresh Now</button>
                  <button className="btn-secondary" onClick={() => { setBillingStatus(null); }}>Clear</button>
                </div>

                <div style={{ marginTop: 18 }} className="responsive-table-container">
                  <pre style={{ whiteSpace: 'pre-wrap', background: '#0f1724', color: '#e6edf3', padding: 12, borderRadius: 6 }}>{JSON.stringify(billingStatus, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Categories Management panel */}
            {activePanel === 'categories' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* Save category form */}
                <form onSubmit={handleSaveCategory} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{categoryForm.id ? "Edit Category" : "Add New Category"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Category Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Electronics"
                      value={categoryForm.name}
                      onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Description text</label>
                    <textarea 
                      placeholder="Category catalog information..."
                      value={categoryForm.description}
                      onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Category Cover Image</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {categoryForm.image_url && (
                        <img src={categoryForm.image_url} alt="Category Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        style={{ border: 'none', padding: '4px 0', cursor: 'pointer' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadFile(file, (url) => {
                              setCategoryForm(prev => ({ ...prev, image_url: url }));
                            });
                          }
                        }}
                      />
                      <input 
                        type="url" 
                        placeholder="Image path URL (automatically filled after upload)"
                        value={categoryForm.image_url || ""}
                        onChange={e => setCategoryForm(prev => ({ ...prev, image_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Return Window (Days)</label>
                    <input 
                      type="number" 
                      placeholder="e.g., 10 (Leave blank for shop default)"
                      value={categoryForm.return_window_days !== null && categoryForm.return_window_days !== undefined ? categoryForm.return_window_days : ""}
                      onChange={e => setCategoryForm(prev => ({ ...prev, return_window_days: e.target.value }))}
                    />
                  </div>
                  {adminShop?.shipping_enabled && adminShop?.shipping_charges_type === 'section' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shipping Charge (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="e.g., 50.00"
                        value={categoryForm.shipping_charge !== null && categoryForm.shipping_charge !== undefined ? categoryForm.shipping_charge : ""}
                        onChange={e => setCategoryForm(prev => ({ ...prev, shipping_charge: e.target.value }))}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        This shipping fee is applied if section-based shipping is active.
                      </span>
                    </div>
                  )}
                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Save Category <Check size={16} />
                  </button>
                </form>

                {/* Categories Table list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Active Product Categories</h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Description</th>
                          {adminShop?.shipping_enabled && adminShop?.shipping_charges_type === 'section' && <th>Shipping Charge</th>}
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminCategories.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{c.name}</td>
                            <td>{c.description}</td>
                            {adminShop?.shipping_enabled && adminShop?.shipping_charges_type === 'section' && (
                              <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{(c.shipping_charge ?? 0).toFixed(2)}</td>
                            )}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setCategoryForm({ ...c, return_window_days: c.return_window_days !== null && c.return_window_days !== undefined ? c.return_window_days : "", shipping_charge: c.shipping_charge !== null && c.shipping_charge !== undefined ? c.shipping_charge : "" })} className="btn-secondary" style={{ padding: '6px' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteCategory(c.id)} className="btn-danger" style={{ padding: '6px' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Collections Management panel */}
            {activePanel === 'collections' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* Save collection form */}
                <form onSubmit={handleSaveCollection} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{collectionForm.id ? "Edit Collection" : "Add New Collection"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Collection Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., The Saree & Ethnic Collection"
                      value={collectionForm.name}
                      onChange={e => setCollectionForm(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Associate Categories</label>
                    <div className="modern-pill-container">
                      {adminCategories.map(c => {
                        const isChecked = collectionForm.category_ids.includes(c.id);
                        return (
                          <div 
                            key={c.id} 
                            className={`modern-select-pill ${isChecked ? 'active' : ''}`}
                            onClick={() => {
                              setCollectionForm(prev => {
                                const updatedCategoryIds = prev.category_ids.includes(c.id)
                                  ? prev.category_ids.filter(id => id !== c.id)
                                  : [...prev.category_ids, c.id];
                                return { ...prev, category_ids: updatedCategoryIds };
                              });
                            }}
                          >
                            <span className="pill-dot" />
                            <span>{c.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <input 
                      type="checkbox" 
                      id="separate_categories_mobile"
                      checked={!!collectionForm.separate_categories_mobile}
                      onChange={e => setCollectionForm(prev => ({ ...prev, separate_categories_mobile: e.target.checked }))}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <label htmlFor="separate_categories_mobile" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      Separate category listing in mobile view
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <input 
                      type="checkbox" 
                      id="show_category_banner"
                      checked={collectionForm.show_category_banner !== false && collectionForm.show_category_banner !== 0}
                      onChange={e => setCollectionForm(prev => ({ ...prev, show_category_banner: e.target.checked }))}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <label htmlFor="show_category_banner" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      Show Category Banner
                    </label>
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Save Collection <Check size={16} />
                  </button>
                  {collectionForm.id && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ justifyContent: 'center' }}
                      onClick={() => setCollectionForm({ id: null, name: "", category_ids: [], separate_categories_mobile: false, show_category_banner: true })}
                    >
                      Cancel Edit
                    </button>
                  )}
                </form>

                {/* Collections Table list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Active Collections</h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Collection Name</th>
                          <th>Linked Categories</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminCollections.map(col => {
                          // Find category names
                          const linkedNames = col.category_ids.map(id => {
                            const found = adminCategories.find(c => c.id === id);
                            return found ? found.name : `Category #${id}`;
                          }).join(", ");

                          return (
                            <tr key={col.id}>
                              <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{col.name}</td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{linkedNames || "No categories linked"}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button onClick={() => setCollectionForm(col)} className="btn-secondary" style={{ padding: '6px' }}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteCollection(col.id)} className="btn-danger" style={{ padding: '6px' }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {adminCollections.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No collections defined. Add one!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Product catalog panel */}
            {activePanel === 'products' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Add product form */}
                <form onSubmit={handleSaveProduct} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontWeight: 800 }}>{productForm.id ? "Edit Product Catalog Item" : "Publish New Product"}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Product Title Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., iPhone 15 Pro"
                        value={productForm.name}
                        onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Category Allocation</label>
                      <select 
                        value={productForm.category_id}
                        onChange={e => setProductForm(prev => ({ ...prev, category_id: e.target.value }))}
                      >
                        <option value="">Choose category...</option>
                        {adminCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Detailed catalog description</label>
                    <textarea 
                      placeholder="Specifications, highlights, and shipping logistics details..."
                      value={productForm.description}
                      onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Sale Price (₹)</label>
                      <input 
                        type="number" 
                        placeholder="12000"
                        value={productForm.price}
                        onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Original MRP (₹)</label>
                      <input 
                        type="number" 
                        placeholder="15000"
                        value={productForm.original_price}
                        onChange={e => setProductForm(prev => ({ ...prev, original_price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Warehouse Stock Quantity</label>
                      <input 
                        type="number" 
                        placeholder="100"
                        value={productForm.stock}
                        onChange={e => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Stock Alert Threshold</label>
                      <input 
                        type="number" 
                        value={productForm.alert_threshold}
                        onChange={e => setProductForm(prev => ({ ...prev, alert_threshold: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Promo Code (Specific discount)</label>
                      <input 
                        type="text" 
                        placeholder="IPHONE20"
                        value={productForm.promo_code}
                        onChange={e => setProductForm(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Promo Code Flat Discount (₹)</label>
                      <input 
                        type="number" 
                        placeholder="2000"
                        value={productForm.promo_discount}
                        onChange={e => setProductForm(prev => ({ ...prev, promo_discount: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Billing POS Integration Codes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'rgba(122,78,165,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(122,78,165,0.1)' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SKU Code (POS Inventory)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., SKU-SHIRT-001"
                        value={productForm.sku_code || ""}
                        onChange={e => setProductForm(prev => ({ ...prev, sku_code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>HSC / HSN Code (GST classification)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., 62052000"
                        value={productForm.hsc_code || ""}
                        onChange={e => setProductForm(prev => ({ ...prev, hsc_code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Barcode (Scan Code)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., 890123456789"
                        value={productForm.barcode || ""}
                        onChange={e => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Return Window (Days)</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 7 (Optional)"
                        value={productForm.return_window_days !== null && productForm.return_window_days !== undefined ? productForm.return_window_days : ""}
                        onChange={e => setProductForm(prev => ({ ...prev, return_window_days: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Bulk Pricing Section */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(122,78,165,0.06), rgba(86,51,122,0.04))', border: '1px solid rgba(122,78,165,0.18)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ background: 'linear-gradient(135deg, #7a4ea5, #56337a)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>B</span>
                      </div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2b0b57', margin: 0 }}>Bulk / Wholesale Pricing</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Optional — leave blank to disable bulk mode)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Bulk Sale Price (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g., 9500"
                          value={productForm.bulk_sale_price}
                          onChange={e => setProductForm(prev => ({ ...prev, bulk_sale_price: e.target.value }))}
                          style={{ borderColor: productForm.bulk_sale_price ? 'rgba(122,78,165,0.5)' : undefined }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Price per unit when buying in bulk</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Minimum Quantity for Bulk</label>
                        <input 
                          type="number" 
                          placeholder="e.g., 10"
                          value={productForm.min_quantity}
                          onChange={e => setProductForm(prev => ({ ...prev, min_quantity: e.target.value }))}
                          style={{ borderColor: productForm.min_quantity ? 'rgba(122,78,165,0.5)' : undefined }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Min units buyer must order for bulk price</span>
                      </div>
                    </div>
                    {productForm.bulk_sale_price && productForm.min_quantity && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(122,78,165,0.08)', borderRadius: '8px', fontSize: '0.82rem', color: '#56337a', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>✓</span>
                        <span>Bulk pricing enabled: <strong>₹{productForm.bulk_sale_price}</strong> per unit for orders of <strong>{productForm.min_quantity}+</strong> units</span>
                      </div>
                    )}
                  </div>

                  {/* Customization Activation Toggle */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fbf9ff', border: '1px solid #f0e6fc', borderRadius: '12px', padding: '16px 20px' }}>
                    <input 
                      type="checkbox" 
                      id="customization_enabled"
                      checked={productForm.customization_enabled || false}
                      onChange={e => setProductForm(prev => ({ ...prev, customization_enabled: e.target.checked }))}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#7a4ea5' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label htmlFor="customization_enabled" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2b0b57', cursor: 'pointer' }}>
                        Allow Bespoke Customization
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Check this to show the "Customization" button to customers, enabling custom tailoring options (colors, notes, quantity).
                      </span>
                    </div>
                  </div>

                  {/* Multiple Product Images - maximum below 10 */}
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Product Images (up to 10 images)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productForm.images.map((img, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', background: 'rgba(0,0,0,0.01)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {img && (
                              <img src={img} alt="Product Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              style={{ border: 'none', padding: '4px 0', cursor: 'pointer', flex: 1 }}
                              onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleUploadFile(file, (url) => {
                                    const updated = [...productForm.images];
                                    updated[i] = url;
                                    setProductForm(prev => ({ ...prev, images: updated }));
                                  });
                                }
                              }}
                            />
                            {productForm.images.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => {
                                  const updated = productForm.images.filter((_, idx) => idx !== i);
                                  setProductForm(prev => ({ ...prev, images: updated }));
                                }}
                                className="btn-danger" 
                                style={{ padding: '8px 12px' }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <input 
                            type="text" 
                            placeholder={`Image URL #${i+1} (automatically filled after upload)`}
                            value={img}
                            onChange={e => {
                              const updated = [...productForm.images];
                              updated[i] = e.target.value;
                              setProductForm(prev => ({ ...prev, images: updated }));
                            }}
                          />
                        </div>
                      ))}
                      {productForm.images.length < 10 && (
                        <button 
                          type="button" 
                          onClick={() => setProductForm(prev => ({ ...prev, images: [...prev.images, ""] }))}
                          className="btn-secondary" 
                          style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'fit-content' }}
                        >
                          <Plus size={14} /> Add Another Image Bullet
                        </button>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>
                    Publish to Store Catalog <Check size={18} />
                  </button>
                </form>

                {/* Products Table list */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <h3 style={{ fontWeight: 800, margin: 0 }}>Current Store Products</h3>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        placeholder="Search products by ID or Name..." 
                        value={adminProductSearch}
                        onChange={e => setAdminProductSearch(e.target.value)}
                        style={{ width: '220px', padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                      
                      <select
                        value={adminProductCategoryFilter}
                        onChange={e => setAdminProductCategoryFilter(e.target.value)}
                        style={{ width: '180px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="">All Categories</option>
                        {adminCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      
                      <button 
                        onClick={handleDownloadProductsReport} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> Download Report
                      </button>
                    </div>
                  </div>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Details</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>MRP</th>
                          <th>Stock</th>
                          <th>Promo discount</th>
                          <th>Bulk Price</th>
                          <th>Min Qty</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdminProducts.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img src={p.images[0] || null} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                <div>
                                  <strong style={{ color: 'var(--text-main)' }}>{p.name}</strong>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    ID: {p.id} {p.sku_code && ` • SKU: ${p.sku_code}`} {p.hsc_code && ` • HSC: ${p.hsc_code}`} {p.barcode && ` • Barcode: ${p.barcode}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td><span className="badge badge-info">{p.category_name}</span></td>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>₹{p.price.toFixed(2)}</td>
                            <td style={{ textDecoration: 'line-through' }}>₹{p.original_price.toFixed(2)}</td>
                            <td>
                              <span className={`badge ${p.stock <= p.alert_threshold ? 'badge-danger' : 'badge-success'}`}>
                                {p.stock} units
                              </span>
                            </td>
                            <td>{p.promo_code ? `${p.promo_code} (-₹${p.promo_discount})` : "None"}</td>
                            <td>
                              {p.bulk_sale_price ? (
                                <span style={{ color: '#7a4ea5', fontWeight: 700 }}>₹{p.bulk_sale_price.toFixed(2)}</span>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                            </td>
                            <td>
                              {p.min_quantity ? (
                                <span className="badge badge-info">{p.min_quantity}+ units</span>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setProductForm({ ...p, images: (p.images && p.images.length > 0) ? p.images : [""], bulk_sale_price: p.bulk_sale_price || "", min_quantity: p.min_quantity || "", customization_enabled: p.customization_enabled || false, barcode: p.barcode || "", sku_code: p.sku_code || "", hsc_code: p.hsc_code || "", return_window_days: p.return_window_days !== null && p.return_window_days !== undefined ? p.return_window_days : "" })} className="btn-secondary" style={{ padding: '6px' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="btn-danger" style={{ padding: '6px' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Orders & Returns panel */}
            {activePanel === 'orders' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Returns management */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div 
                    onClick={() => setAdminReturnsCollapsed(!adminReturnsCollapsed)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      transition: 'all 0.3s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontWeight: 800, margin: 0, color: 'var(--accent-danger)', fontSize: '1.2rem' }}>
                        Pending Customer Return Requests
                      </h3>
                      <span style={{ 
                        background: 'var(--accent-danger)', 
                        color: 'white', 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '20px',
                        fontWeight: 'bold' 
                      }}>
                        {adminOrders.filter(o => o.return_request_status === 'Pending').length} Pending
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-danger)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {adminReturnsCollapsed ? 'Show' : 'Hide'}
                      </span>
                      {adminReturnsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </div>

                  {!adminReturnsCollapsed && (
                    <div className="responsive-table-container glass-panel animate-fade-in">
                      <table>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Ordered Date</th>
                            <th>Buyer</th>
                            <th>Returned Products</th>
                            <th>Return Reason</th>
                            <th>Verification Photo</th>
                            <th>Refund Value</th>
                            <th style={{ textAlign: 'right' }}>Decide Resolution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminOrders.filter(o => o.return_request_status === 'Pending').map(o => (
                            <tr key={o.id}>
                              <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{getDisplayOrderNumber(o)}</td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td>{o.user_name}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {o.items && o.items.map(item => (
                                    <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <img 
                                        src={item.product_image || "https://images.unsplash.com/photo-1608748010899-18f300247112?w=50"} 
                                        alt={item.product_name} 
                                        style={{ 
                                          width: '55px', 
                                          height: '55px', 
                                          objectFit: 'cover', 
                                          borderRadius: '6px', 
                                          border: '1px solid var(--border-subtle)',
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s'
                                        }} 
                                        onClick={() => setExpandedImage(item.product_image || "https://images.unsplash.com/photo-1608748010899-18f300247112?w=50")}
                                        title="Click to view product photo"
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', lineHeight: '1.2', textAlign: 'left' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.product_name}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          ID: #{item.product_id} | Qty: {item.quantity} | Cat: {item.category_name}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td>"{o.return_reason}"</td>
                              <td>
                                {o.return_image_url ? (
                                  <img 
                                    src={o.return_image_url} 
                                    alt="Verification" 
                                    style={{ 
                                      width: '70px', 
                                      height: '70px', 
                                      objectFit: 'cover', 
                                      borderRadius: '8px', 
                                      border: '1px solid var(--border-subtle)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s'
                                    }}
                                    onClick={() => setExpandedImage(o.return_image_url)}
                                    title="Click to view full verification photo"
                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No image provided</span>
                                )}
                              </td>
                              <td style={{ fontWeight: 'bold', color: '#10b981' }}>₹{o.final_amount}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  {o.shipping_label_url && (
                                    <button 
                                      onClick={() => window.open(o.shipping_label_url, '_blank')}
                                      className="btn-secondary" 
                                      style={{ 
                                        padding: '6px 12px', 
                                        fontSize: '0.75rem', 
                                        borderColor: '#7a4ea5', 
                                        color: '#7a4ea5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <Printer size={12} /> Label
                                    </button>
                                  )}
                                  <button onClick={() => handleResolveReturn(o.id, 'Approved')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--accent-success)' }}>
                                    Approve & Refund
                                  </button>
                                  <button onClick={() => handleResolveReturn(o.id, 'Rejected')} className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                    Reject request
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {adminOrders.filter(o => o.return_request_status === 'Pending').length === 0 && (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No pending return claims currently registered.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Orders list with Filters & Export */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div 
                    onClick={() => setAdminOrdersCollapsed(!adminOrdersCollapsed)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: 'rgba(122, 78, 165, 0.06)',
                      border: '1px solid rgba(122, 78, 165, 0.15)',
                      transition: 'all 0.3s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(122, 78, 165, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(122, 78, 165, 0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontWeight: 800, margin: 0, color: '#2b0b57', fontSize: '1.2rem' }}>
                        Store Sales Transactions
                      </h3>
                      <span style={{ 
                        background: '#7a4ea5', 
                        color: 'white', 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '20px',
                        fontWeight: 'bold' 
                      }}>
                        {filteredAdminOrders.length} {filteredAdminOrders.length === 1 ? 'Transaction' : 'Transactions'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7a4ea5' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {adminOrdersCollapsed ? 'Show' : 'Hide'}
                      </span>
                      {adminOrdersCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </div>

                  {!adminOrdersCollapsed && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        
                        {/* Date filters and CSV export action container */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Orders</label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="text" 
                                placeholder="ID, Buyer, Item, Status..." 
                                value={adminOrderSearch} 
                                onChange={(e) => setAdminOrderSearch(e.target.value)} 
                                style={{ 
                                  padding: '8px 12px 8px 32px', 
                                  borderRadius: '6px', 
                                  border: '1px solid rgba(154, 132, 200, 0.3)', 
                                  background: 'rgba(255, 255, 255, 0.8)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.8rem',
                                  width: '220px',
                                  outline: 'none',
                                  transition: 'all 0.2s ease'
                                }} 
                                onFocus={(e) => e.target.style.borderColor = '#7a4ea5'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(154, 132, 200, 0.3)'}
                              />
                              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date Filter</label>
                            <select
                              value={adminDateFilter}
                              onChange={(e) => setAdminDateFilter(e.target.value)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(154, 132, 200, 0.3)',
                                background: 'rgba(255, 255, 255, 0.8)',
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                outline: 'none'
                              }}
                            >
                              <option value="all">All Dates</option>
                              <option value="today">Today</option>
                              <option value="month">This Month</option>
                              <option value="year">This Year</option>
                              <option value="custom">Custom Range</option>
                            </select>
                          </div>

                          {adminDateFilter === 'custom' && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Start Date</label>
                                <input 
                                  type="date" 
                                  value={adminStartDate} 
                                  onChange={(e) => setAdminStartDate(e.target.value)} 
                                  style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '6px', 
                                    border: '1px solid rgba(154, 132, 200, 0.3)', 
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                  }} 
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>End Date</label>
                                <input 
                                  type="date" 
                                  value={adminEndDate} 
                                  onChange={(e) => setAdminEndDate(e.target.value)} 
                                  style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '6px', 
                                    border: '1px solid rgba(154, 132, 200, 0.3)', 
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                  }} 
                                />
                              </div>
                            </>
                          )}
                          
                          {(adminStartDate || adminEndDate || adminOrderSearch || adminDateFilter !== "all") && (
                            <button 
                              onClick={() => { setAdminStartDate(''); setAdminEndDate(''); setAdminOrderSearch(''); setAdminDateFilter('all'); }} 
                              className="btn-secondary" 
                              style={{ padding: '8px 12px', fontSize: '0.75rem', height: '36px' }}
                            >
                              Clear
                            </button>
                          )}
                          
                          <button 
                            onClick={exportOrdersCSV} 
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.8rem', height: '36px' }}
                          >
                            <Download size={14} /> Export CSV Report
                          </button>
                        </div>
                      </div>

                      <div className="responsive-table-container glass-panel">
                        <table>
                          <thead>
                            <tr>
                              <th>Order ID & Date</th>
                              <th>Buyer</th>
                              <th>Items Ordered</th>
                              <th>Shipping Location</th>
                              <th>Gross Total</th>
                              <th>Method</th>
                              <th>Ship State</th>
                              <th style={{ textAlign: 'right' }}>Logistics dispatch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdminOrders.map(o => (
                              <tr key={o.id}>
                                <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                                  <div>{getDisplayOrderNumber(o)}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>
                                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                                  </div>
                                  {!(o.payment_method === 'COD' && (o.status === 'Pending' || o.status === 'Rejected')) && (
                                    <button
                                      onClick={() => setInvoiceOrder(o)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#7a4ea5',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                        padding: 0,
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 600
                                      }}
                                      title="Click to view tax invoice receipt"
                                    >
                                      <FileText size={12} style={{ color: '#7a4ea5' }} /> View Invoice
                                    </button>
                                  )}
                                </td>
                                <td>
                                  <button 
                                    onClick={() => handleShowCustomerHistory(o.user_id, o.user_name)} 
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      color: '#7a4ea5', 
                                      textDecoration: 'underline', 
                                      cursor: 'pointer', 
                                      fontWeight: 600,
                                      padding: 0,
                                      textAlign: 'left',
                                      fontSize: '0.85rem'
                                    }}
                                    title="Click to view full purchase history"
                                  >
                                    {o.user_name}
                                  </button>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', maxWidth: '320px' }}>
                                    {o.items && o.items.map((item, idx) => (
                                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.4)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(154, 132, 200, 0.1)' }}>
                                        {item.product_image ? (
                                          <img 
                                            src={item.product_image} 
                                            alt={item.product_name} 
                                            style={{ 
                                              width: '32px', 
                                              height: '32px', 
                                              objectFit: 'cover', 
                                              borderRadius: '4px', 
                                              border: '1px solid rgba(154, 132, 200, 0.15)',
                                              cursor: 'pointer',
                                              transition: 'transform 0.2s'
                                            }}
                                            onClick={() => setExpandedImage(item.product_image)}
                                            title="Click to view full image"
                                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                          />
                                        ) : (
                                          <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f3e6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#9a84c8' }}>
                                            No img
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.product_name}>
                                            {item.product_name}
                                          </div>
                                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                                            <span>ID: {item.product_id}</span>
                                            <span>•</span>
                                            <span>{item.category_name || 'Uncategorized'}</span>
                                          </div>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#7a4ea5', flexShrink: 0 }}>
                                          x{item.quantity} (₹{item.price})
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <div
                                    title={o.shipping_address}
                                    style={{
                                      maxWidth: '260px',
                                      maxHeight: '3.6rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      wordBreak: 'break-word',
                                      whiteSpace: 'normal',
                                      color: 'var(--text-muted)'
                                    }}
                                  >
                                    {o.shipping_address}
                                  </div>
                                </td>
                                <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>₹{o.final_amount}</td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                    <span className="badge badge-info">{o.payment_method}</span>
                                    {o.payment_method === 'UPI' && o.razorpay_payment_id && (
                                      <button
                                        onClick={() => setActiveTransactionOrder(o)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#7a4ea5',
                                          textDecoration: 'underline',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem',
                                          padding: 0,
                                          textAlign: 'left',
                                          fontWeight: 600,
                                          marginTop: '4px'
                                        }}
                                        title="Click to view transaction details"
                                      >
                                        {o.razorpay_payment_id}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    o.status === 'Customer Received' ? 'badge-success' : o.status === 'Dispatched' ? 'badge-info' : o.status === 'Accepted' ? 'badge-info' : o.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                  }`}>
                                    {o.status}
                                  </span>
                                </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {o.status === 'Pending' && (
                                      <>
                                        {o.payment_method === 'COD' ? (
                                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                              onClick={() => handleUpdateOrderStatus(o.id, 'Accepted')} 
                                              className="btn-primary" 
                                              style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                                            >
                                              Accept
                                            </button>
                                            <button 
                                              onClick={() => handleUpdateOrderStatus(o.id, 'Rejected')} 
                                              className="btn-danger" 
                                              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                            <button 
                                              onClick={() => handleUpdateOrderStatus(o.id, 'Dispatched')} 
                                              className="btn-primary" 
                                              style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%', maxWidth: '160px' }}
                                            >
                                              Dispatch Order
                                            </button>
                                            <button 
                                              onClick={() => {
                                                const weightStr = prompt("Enter package weight in kg:", "0.5");
                                                if (weightStr !== null) {
                                                  const weight = parseFloat(weightStr) || 0.5;
                                                  handleBookDtdcShipping(o.id, weight);
                                                }
                                              }}
                                              className="btn-primary" 
                                              disabled={bookingShippingId === o.id}
                                              style={{ 
                                                padding: '6px 12px', 
                                                fontSize: '0.75rem', 
                                                background: '#7a4ea5', 
                                                borderColor: '#7a4ea5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                width: '100%',
                                                maxWidth: '160px'
                                              }}
                                            >
                                              <Truck size={12} />
                                              {bookingShippingId === o.id ? 'Booking...' : 'Book DTDC'}
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {o.status === 'Accepted' && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                        <button 
                                          onClick={() => handleUpdateOrderStatus(o.id, 'Dispatched')} 
                                          className="btn-primary" 
                                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%', maxWidth: '160px' }}
                                        >
                                          Dispatch Order
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const weightStr = prompt("Enter package weight in kg:", "0.5");
                                            if (weightStr !== null) {
                                              const weight = parseFloat(weightStr) || 0.5;
                                              handleBookDtdcShipping(o.id, weight);
                                            }
                                          }}
                                          className="btn-primary" 
                                          disabled={bookingShippingId === o.id}
                                          style={{ 
                                            padding: '6px 12px', 
                                            fontSize: '0.75rem', 
                                            background: '#7a4ea5', 
                                            borderColor: '#7a4ea5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            width: '100%',
                                            maxWidth: '160px'
                                          }}
                                        >
                                          <Truck size={12} />
                                          {bookingShippingId === o.id ? 'Booking...' : 'Book DTDC'}
                                        </button>
                                      </div>
                                    )}
                                    {o.status === 'Dispatched' && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                        <button onClick={() => handleUpdateOrderStatus(o.id, 'Customer Received')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--accent-success)', color: '#34d399', width: '100%', maxWidth: '160px' }}>
                                          Confirm Delivery
                                        </button>
                                        {o.shipping_label_url && (
                                          <button 
                                            onClick={() => window.open(o.shipping_label_url, '_blank')}
                                            className="btn-secondary" 
                                            style={{ 
                                              padding: '6px 12px', 
                                              fontSize: '0.75rem', 
                                              borderColor: '#7a4ea5', 
                                              color: '#7a4ea5',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '6px',
                                              width: '100%',
                                              maxWidth: '160px'
                                            }}
                                          >
                                            <Printer size={12} /> Label
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {o.status === 'Customer Received' && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fully Delivered</span>
                                    )}
                                    {o.status === 'Returned' && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 'bold' }}>Wiped (Returned)</span>
                                    )}
                                    {o.status === 'Rejected' && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 'bold' }}>Rejected</span>
                                    )}
                                  </td>
                              </tr>
                            ))}
                            {filteredAdminOrders.length === 0 && (
                              <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No matching transactions found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Purchase History Modal */}
                {selectedCustomerHistory && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                  }}>
                    <div className="glass-panel" style={{
                      width: '100%',
                      maxWidth: '750px',
                      maxHeight: '85vh',
                      overflowY: 'auto',
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      padding: '28px',
                      position: 'relative',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(154, 132, 200, 0.3)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <button 
                        onClick={() => setSelectedCustomerHistory(null)}
                        style={{
                          position: 'absolute',
                          top: '20px',
                          right: '20px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '4px'
                        }}
                      >
                        <X size={20} />
                      </button>
                      
                      <div>
                        <h3 style={{ 
                          fontFamily: "'Playfair Display', serif", 
                          fontSize: '1.8rem', 
                          fontWeight: 700, 
                          color: '#2b0b57',
                          marginBottom: '6px'
                        }}>
                          Customer Purchase History
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Showing all purchase records for: <strong>{selectedCustomerHistory.userName}</strong> (User ID: #{selectedCustomerHistory.userId})
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
                        {selectedCustomerHistory.orders.length === 0 ? (
                          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No orders found for this customer.</p>
                        ) : (
                          selectedCustomerHistory.orders.map((o) => (
                            <div key={o.id} style={{
                              padding: '16px',
                              border: '1px solid rgba(154, 132, 200, 0.15)',
                              borderRadius: '10px',
                              background: 'rgba(243, 230, 255, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                  <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>Order {getDisplayOrderNumber(o)}</strong>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                                  </span>
                                  {!(o.payment_method === 'COD' && (o.status === 'Pending' || o.status === 'Rejected')) && (
                                    <button
                                      onClick={() => setInvoiceOrder(o)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#7a4ea5',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: 0,
                                        marginLeft: '12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 600
                                      }}
                                    >
                                      <FileText size={12} style={{ color: '#7a4ea5' }} /> View Invoice
                                    </button>
                                  )}
                                </div>
                                <span className={`badge ${
                                  o.status === 'Customer Received' ? 'badge-success' : o.status === 'Dispatched' ? 'badge-info' : o.status === 'Accepted' ? 'badge-info' : o.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                }`}>
                                  {o.status}
                                </span>
                              </div>

                              <div style={{ borderTop: '1px dashed rgba(154, 132, 200, 0.2)', paddingTop: '10px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2b0b57', marginBottom: '8px' }}>Items Ordered:</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                  {o.items && o.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.6)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(154, 132, 200, 0.1)' }}>
                                      {item.product_image ? (
                                        <img 
                                          src={item.product_image} 
                                          alt={item.product_name} 
                                          style={{ 
                                            width: '36px', 
                                            height: '36px', 
                                            objectFit: 'cover', 
                                            borderRadius: '4px', 
                                            border: '1px solid rgba(154, 132, 200, 0.15)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                          }}
                                          onClick={() => setExpandedImage(item.product_image)}
                                          title="Click to view full image"
                                          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                      ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: '#f3e6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#9a84c8' }}>
                                          No img
                                        </div>
                                      )}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.product_name}>
                                          {item.product_name}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
                                          <span>ID: {item.product_id}</span>
                                          <span>•</span>
                                          <span>{item.category_name || 'Uncategorized'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#7a4ea5', fontWeight: 500, marginTop: '2px' }}>
                                          Qty: {item.quantity} • ₹{item.price}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(154, 132, 200, 0.15)', paddingTop: '10px', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Method: <strong>{o.payment_method}</strong></span>
                                <span style={{ color: 'var(--text-muted)' }}>Phone: <strong>{o.billing_phone || 'N/A'}</strong></span>
                                <strong style={{ color: '#2b0b57', fontSize: '0.95rem' }}>Total: ₹{o.final_amount}</strong>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button 
                          onClick={() => setSelectedCustomerHistory(null)}
                          className="btn-secondary" 
                          style={{ padding: '8px 24px', fontSize: '0.85rem' }}
                        >
                          Close History
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Inventory panel with alerts */}
            {activePanel === 'inventory' && adminInventory && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unique Products</span>
                    <h2 style={{ fontWeight: 800, fontSize: '2rem', marginTop: '8px' }}>{adminInventory.total_unique_products} Items</h2>
                  </div>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Warehoused Stock</span>
                    <h2 style={{ fontWeight: 800, fontSize: '2rem', marginTop: '8px' }}>{adminInventory.total_stock_count} units</h2>
                  </div>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Store Inventory Evaluation</span>
                    <h2 style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--accent-secondary)', marginTop: '8px' }}>₹{adminInventory.total_inventory_value.toFixed(2)}</h2>
                  </div>
                </div>

                {/* Stock alert triggers */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', color: adminInventory.alerts.length > 0 ? 'var(--accent-danger)' : 'white' }}>
                    <AlertCircle /> Stock Threshold Warnings ({adminInventory.alerts.length})
                  </h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Product ID</th>
                          <th>Product Name</th>
                          <th>Available Stock</th>
                          <th>Alert Threshold</th>
                          <th style={{ textAlign: 'right' }}>Restock adjustment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminInventory.alerts.map(al => (
                          <tr key={al.id} style={{ background: 'rgba(239,68,68,0.04)' }}>
                            <td style={{ fontWeight: 'bold' }}>#{al.id}</td>
                            <td style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{al.name}</td>
                            <td><span className="badge badge-danger">{al.stock} Remaining</span></td>
                            <td>{al.threshold} units limit</td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => {
                                // Find item in product list and open edit form
                                const p = adminProducts.find(x => x.id === al.id);
                                if (p) {
                                  setProductForm({ ...p, images: (p.images && p.images.length > 0) ? p.images : [""], return_window_days: p.return_window_days !== null && p.return_window_days !== undefined ? p.return_window_days : "" });
                                  setActivePanel("products");
                                  addToast("Modify Stock", "Input updated stock quantity in the catalog form below.", "info");
                                }
                              }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                Replenish Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                        {adminInventory.alerts.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--accent-success)', fontWeight: 'bold' }}>All product warehouses adequately stocked.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Graphical Revenue Report panel */}
            {activePanel === 'revenue' && adminRevenue && (() => {
              // Helper calculations for Bar Chart
              const dailySales = adminRevenue.charts.daily_sales || [];
              const maxBarValue = dailySales.length > 0
                ? Math.max(...dailySales.map(x => x.revenue), 1000) * 1.15
                : 1000;

              const svgW = 500;
              const svgH = 280;
              const padLeft = 55;
              const padRight = 15;
              const padTop = 20;
              const padBottom = 35;
              const chartW = svgW - padLeft - padRight;
              const chartH = svgH - padTop - padBottom;

              const formatYLabel = (val) => {
                if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                return `₹${val.toFixed(0)}`;
              };

              const getBarPath = (x, y, w, h, r) => {
                if (h <= 0) return '';
                const radius = Math.min(r, h, w / 2);
                const bottom = padTop + chartH;
                return `
                  M ${x},${bottom}
                  V ${y + radius}
                  A ${radius},${radius} 0 0,1 ${x + radius},${y}
                  H ${x + w - radius}
                  A ${radius},${radius} 0 0,1 ${x + w},${y + radius}
                  V ${bottom}
                  Z
                `.replace(/\s+/g, ' ').trim();
              };

              // Helper calculations for Donut Chart
              const categorySales = adminRevenue.charts.category_sales || [];
              const totalCatRevenue = categorySales.reduce((sum, item) => sum + item.value, 0) || 1;

              const donutRadius = 80;
              const donutCenter = 110;
              const strokeW = 18;
              const circumference = 2 * Math.PI * donutRadius; // 502.65

              const categoryGradients = [
                { start: '#9a84c8', end: '#b9a4ea' }, // Lavender
                { start: '#e84e7e', end: '#f48fb1' }, // Red-Pink
                { start: '#f59e0b', end: '#fbbf24' }, // Warm Gold
                { start: '#10b981', end: '#34d399' }, // Emerald Teal
                { start: '#3b82f6', end: '#60a5fa' }, // Blue
                { start: '#6366f1', end: '#818cf8' }, // Indigo
                { start: '#ec4899', end: '#f472b6' }  // Magenta
              ];

              let accumulatedPercent = 0;

              return (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET SALES REVENUE</span>
                      <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-success)', marginTop: '4px' }}>₹{adminRevenue.summary.total_revenue}</h3>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GST TAX COLLECTED</span>
                      <h3 style={{ fontWeight: 800, fontSize: '1.6rem', marginTop: '4px' }}>₹{adminRevenue.summary.gst_collected}</h3>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ORDER VOLUME</span>
                      <h3 style={{ fontWeight: 800, fontSize: '1.6rem', marginTop: '4px' }}>{adminRevenue.summary.order_count} Sales</h3>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVERAGE ORDER VALUE</span>
                      <h3 style={{ fontWeight: 800, fontSize: '1.6rem', marginTop: '4px' }}>₹{adminRevenue.summary.average_order_value}</h3>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    
                    {/* Daily sales progress */}
                    <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                      <h4 style={{ fontWeight: 800, marginBottom: '16px', letterSpacing: '0.5px' }}>Daily Sales Progress (past week)</h4>
                      
                      {dailySales.length > 0 ? (
                        <div style={{ position: 'relative', width: '100%', height: '280px' }}>
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9a84c8" />
                                <stop offset="100%" stopColor="#b9a4ea" />
                              </linearGradient>
                            </defs>

                            {/* Y Grid Lines & Y Labels */}
                            {[0, 1, 2, 3, 4].map((i) => {
                              const yVal = (i / 4) * maxBarValue;
                              const yPos = padTop + chartH - (i / 4) * chartH;
                              return (
                                <g key={i}>
                                  <line 
                                    x1={padLeft} 
                                    y1={yPos} 
                                    x2={svgW - padRight} 
                                    y2={yPos} 
                                    stroke="rgba(154, 132, 200, 0.08)" 
                                    strokeDasharray="4 4" 
                                  />
                                  <text
                                    x={padLeft - 8}
                                    y={yPos + 4}
                                    textAnchor="end"
                                    fill="var(--text-muted)"
                                    style={{ fontSize: '10px', fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
                                  >
                                    {formatYLabel(yVal)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Bars & Hover Tooltip logic */}
                            {dailySales.map((item, idx) => {
                              const step = chartW / dailySales.length;
                              const barW = Math.max(step * 0.55, 14);
                              const barH = (item.revenue / maxBarValue) * chartH;
                              const xPos = padLeft + idx * step + (step - barW) / 2;
                              const yPos = padTop + chartH - barH;
                              const pathD = getBarPath(xPos, yPos, barW, barH, 5);

                              return (
                                <g key={idx}>
                                  {/* Bar Path */}
                                  <path
                                    d={pathD}
                                    fill={hoveredBarIndex === idx ? 'var(--accent-primary)' : 'url(#barGrad)'}
                                    style={{
                                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                      cursor: 'pointer',
                                      filter: hoveredBarIndex === idx ? 'drop-shadow(0px 4px 10px rgba(154, 132, 200, 0.3))' : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredBarIndex(idx)}
                                    onMouseLeave={() => setHoveredBarIndex(null)}
                                  />

                                  {/* Invisible wider interaction area for easier hovering */}
                                  <rect
                                    x={padLeft + idx * step}
                                    y={padTop}
                                    width={step}
                                    height={chartH + padBottom}
                                    fill="transparent"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredBarIndex(idx)}
                                    onMouseLeave={() => setHoveredBarIndex(null)}
                                  />

                                  {/* X Axis Date Label */}
                                  <text
                                    x={xPos + barW / 2}
                                    y={padTop + chartH + 18}
                                    textAnchor="middle"
                                    fill="var(--text-muted)"
                                    style={{ fontSize: '10.5px', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}
                                  >
                                    {item.date.split('-').slice(1).join('/')}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          {/* HTML Floating Tooltip */}
                          {hoveredBarIndex !== null && (() => {
                            const step = chartW / dailySales.length;
                            const barW = Math.max(step * 0.55, 14);
                            const item = dailySales[hoveredBarIndex];
                            const barH = (item.revenue / maxBarValue) * chartH;
                            const xPos = padLeft + hoveredBarIndex * step + (step - barW) / 2 + barW / 2;
                            const yPos = padTop + chartH - barH;

                            const tooltipLeftPct = (xPos / svgW) * 100;
                            const tooltipTopPct = (yPos / svgH) * 100;

                            return (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${tooltipLeftPct}%`,
                                  top: `${tooltipTopPct}%`,
                                  transform: 'translate(-50%, -120%)',
                                  background: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid rgba(154, 132, 200, 0.3)',
                                  borderRadius: '5px',
                                  padding: '8px 12px',
                                  boxShadow: '0 8px 24px rgba(154, 132, 200, 0.15)',
                                  zIndex: 10,
                                  pointerEvents: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  whiteSpace: 'nowrap',
                                  backdropFilter: 'blur(4px)'
                                }}
                              >
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#7a4ea5', fontWeight: 800 }}>
                                  ₹{item.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No daily sales recorded yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Category distribution */}
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontWeight: 800, marginBottom: '16px', letterSpacing: '0.5px' }}>Revenue share by category</h4>
                      
                      {categorySales.length > 0 ? (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'row', 
                          gap: '24px', 
                          flexWrap: 'wrap', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexGrow: 1 
                        }}>
                          {/* Donut Chart Container */}
                          <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
                            <svg viewBox="0 0 220 220" width="100%" height="100%">
                              <defs>
                                {categoryGradients.map((g, idx) => (
                                  <linearGradient key={idx} id={`catGrad-${idx}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={g.start} />
                                    <stop offset="100%" stopColor={g.end} />
                                  </linearGradient>
                                ))}
                              </defs>

                              {/* Base Track */}
                              <circle
                                cx={donutCenter}
                                cy={donutCenter}
                                r={donutRadius}
                                fill="none"
                                stroke="rgba(154, 132, 200, 0.04)"
                                strokeWidth={strokeW}
                              />

                              {/* Concentric Arc Segments */}
                              {categorySales.map((item, idx) => {
                                const pct = item.value / totalCatRevenue;
                                const strokeDashOffset = 0;
                                const strokeDashArray = `${circumference * pct} ${circumference}`;
                                const rotation = (accumulatedPercent * 360) - 90;
                                
                                // Accumulate percent for next segments
                                accumulatedPercent += pct;

                                return (
                                  <circle
                                    key={idx}
                                    cx={donutCenter}
                                    cy={donutCenter}
                                    r={donutRadius}
                                    fill="none"
                                    stroke={`url(#catGrad-${idx % categoryGradients.length})`}
                                    strokeWidth={hoveredCategoryIndex === idx ? strokeW + 4 : strokeW}
                                    strokeDasharray={strokeDashArray}
                                    strokeDashoffset={strokeDashOffset}
                                    transform={`rotate(${rotation} ${donutCenter} ${donutCenter})`}
                                    style={{
                                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                      cursor: 'pointer',
                                      opacity: hoveredCategoryIndex === null || hoveredCategoryIndex === idx ? 1 : 0.4
                                    }}
                                    onMouseEnter={() => setHoveredCategoryIndex(idx)}
                                    onMouseLeave={() => setHoveredCategoryIndex(null)}
                                  />
                                );
                              })}

                              {/* Center Readout Text */}
                              <g style={{ pointerEvents: 'none' }}>
                                <text
                                  x={donutCenter}
                                  y={donutCenter - 8}
                                  textAnchor="middle"
                                  fill="var(--text-muted)"
                                  style={{ 
                                    fontSize: '9px', 
                                    fontWeight: 700, 
                                    letterSpacing: '1.2px', 
                                    fontFamily: "'Jost', sans-serif" 
                                  }}
                                >
                                  {hoveredCategoryIndex !== null 
                                    ? categorySales[hoveredCategoryIndex].name.toUpperCase()
                                    : 'TOTAL REVENUE'}
                                </text>
                                <text
                                  x={donutCenter}
                                  y={donutCenter + 14}
                                  textAnchor="middle"
                                  fill="#2b0b57"
                                  style={{ 
                                    fontSize: '18px', 
                                    fontWeight: 800, 
                                    fontFamily: "'Jost', sans-serif" 
                                  }}
                                >
                                  ₹{hoveredCategoryIndex !== null
                                    ? categorySales[hoveredCategoryIndex].value.toLocaleString('en-IN')
                                    : totalCatRevenue.toLocaleString('en-IN')}
                                </text>
                                {hoveredCategoryIndex !== null && (
                                  <text
                                    x={donutCenter}
                                    y={donutCenter + 28}
                                    textAnchor="middle"
                                    fill="var(--accent-secondary)"
                                    style={{ 
                                      fontSize: '10.5px', 
                                      fontWeight: 700, 
                                      fontFamily: "'Jost', sans-serif" 
                                    }}
                                  >
                                    {Math.round((categorySales[hoveredCategoryIndex].value / totalCatRevenue) * 100)}% share
                                  </text>
                                )}
                              </g>
                            </svg>
                          </div>

                          {/* Legend Column */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '10px', 
                            flexGrow: 1, 
                            minWidth: '180px' 
                          }}>
                            {categorySales.map((item, idx) => {
                              const pct = Math.round((item.value / totalCatRevenue) * 100);
                              const colors = categoryGradients[idx % categoryGradients.length];
                              const isHovered = hoveredCategoryIndex === idx;

                              return (
                                <div 
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '6px 10px',
                                    borderRadius: '5px',
                                    background: isHovered ? 'rgba(154, 132, 200, 0.05)' : 'transparent',
                                    border: isHovered ? '1px solid rgba(154, 132, 200, 0.15)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={() => setHoveredCategoryIndex(idx)}
                                  onMouseLeave={() => setHoveredCategoryIndex(null)}
                                >
                                  {/* Gradient Indicator Dot */}
                                  <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${colors.start}, ${colors.end})`,
                                    boxShadow: isHovered ? '0 0 6px rgba(154, 132, 200, 0.6)' : 'none',
                                    flexShrink: 0
                                  }} />

                                  {/* Label and Value */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', alignItems: 'center' }}>
                                    <span style={{ 
                                      fontWeight: isHovered ? 700 : 500, 
                                      color: isHovered ? '#2b0b57' : 'var(--text-main)' 
                                    }}>{item.name}</span>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                      <strong style={{ color: isHovered ? '#7a4ea5' : 'var(--text-main)' }}>₹{item.value.toLocaleString('en-IN')}</strong>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{pct}% share</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No categories registered.</p>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })()}

            {/* Popup Ads panel */}
            {activePanel === 'popup_ads' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* Save Ad banner form */}
                <form onSubmit={handleSavePopupAd} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{adForm.id ? "Edit Popup Banner" : "New Ad Banner Campaign"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Campaign Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Tech Season Blowout"
                      value={adForm.title}
                      onChange={e => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                      required 
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Campaign Banner Image</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {adForm.image_url && (
                        <img src={adForm.image_url} alt="Ad Banner Preview" style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        style={{ border: 'none', padding: '4px 0', cursor: 'pointer' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadFile(file, (url) => {
                              setAdForm(prev => ({ ...prev, image_url: url }));
                            });
                          }
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="Image path URL (automatically filled after upload)"
                        value={adForm.image_url}
                        onChange={e => setAdForm(prev => ({ ...prev, image_url: e.target.value }))}
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Navigation Link</label>
                    <input 
                      type="text" 
                      placeholder="/shop/1"
                      value={adForm.target_url}
                      onChange={e => setAdForm(prev => ({ ...prev, target_url: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '20px', height: '20px' }}
                        checked={adForm.show_before_login}
                        onChange={e => setAdForm(prev => ({ ...prev, show_before_login: e.target.checked }))}
                      />
                      <span style={{ fontSize: '0.75rem' }}>Show Guest Visitor</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '20px', height: '20px' }}
                        checked={adForm.show_after_login}
                        onChange={e => setAdForm(prev => ({ ...prev, show_after_login: e.target.checked }))}
                      />
                      <span style={{ fontSize: '0.75rem' }}>Show Logged In</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px' }}
                      checked={adForm.is_active}
                      onChange={e => setAdForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Campaign Active Toggle</span>
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Save Ad Campaign <Check size={16} />
                  </button>
                </form>

                {/* Ads list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Active Promotional Banners</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {adminPopupAds.map(ad => (
                      <div key={ad.id} className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <img src={ad.image_url || null} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flexGrow: 1 }}>
                          <h5 style={{ fontWeight: 800 }}>{ad.title}</h5>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target: {ad.target_url || "none"}</span>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            {ad.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Disabled</span>}
                            {ad.show_before_login && <span className="badge badge-info">Guest</span>}
                            {ad.show_after_login && <span className="badge badge-info">Users</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => setAdForm(ad)} className="btn-secondary" style={{ padding: '6px' }}><Edit2 size={12} /></button>
                          <button onClick={() => handleDeletePopupAd(ad.id)} className="btn-danger" style={{ padding: '6px' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Coupons panel */}
            {activePanel === 'coupons' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* Save Coupon form */}
                <form onSubmit={handleSaveCoupon} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{couponForm.id ? "Edit Coupon" : "Add Discount Code"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Coupon Code (Caps)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., TECH20"
                      value={couponForm.code}
                      onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Discount (%)</label>
                      <input 
                        type="number" 
                        placeholder="20"
                        value={couponForm.discount_percentage}
                        onChange={e => setCouponForm(prev => ({ ...prev, discount_percentage: e.target.value }))}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Max Discount Limit (₹)</label>
                      <input 
                        type="number" 
                        value={couponForm.max_discount}
                        onChange={e => setCouponForm(prev => ({ ...prev, max_discount: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Minimum Purchase Required (₹)</label>
                    <input 
                      type="number" 
                      value={couponForm.min_purchase}
                      onChange={e => setCouponForm(prev => ({ ...prev, min_purchase: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px' }}
                      checked={couponForm.is_active}
                      onChange={e => setCouponForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Coupon Active status</span>
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Publish Discount Coupon <Check size={16} />
                  </button>
                </form>

                {/* Coupons Table list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Available Store Coupons</h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Value (%)</th>
                          <th>Min Spend</th>
                          <th>Max Cap</th>
                          <th>State</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminCoupons.map(cp => (
                          <tr key={cp.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{cp.code}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{cp.discount_percentage}%</td>
                            <td>₹{cp.min_purchase}</td>
                            <td>₹{cp.max_discount}</td>
                            <td>{cp.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Disabled</span>}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setCouponForm(cp)} className="btn-secondary" style={{ padding: '6px' }}><Edit2 size={12} /></button>
                                <button onClick={() => handleDeleteCoupon(cp.id)} className="btn-danger" style={{ padding: '6px' }}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Support Tickets panel */}
            {activePanel === 'help_center' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Tickets list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Help Center support tickets</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {adminHelpTickets.map(t => (
                      <div key={t.id} className="glass-panel" style={{ padding: '20px', cursor: 'pointer', borderColor: ticketReplyForm.ticket_id === t.id ? 'var(--accent-primary)' : 'var(--border-subtle)' }} onClick={() => setTicketReplyForm({ ticket_id: t.id, reply: t.reply || "" })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{t.subject}</h4>
                          <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer: <strong>{t.user_name}</strong></p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '8px' }}>"{t.message}"</p>
                        {t.reply && <p style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '6px' }}>Reply: "{t.reply}"</p>}
                      </div>
                    ))}
                    {adminHelpTickets.length === 0 && (
                      <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No support cases opened in this shop currently.</p>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                {ticketReplyForm.ticket_id && (
                  <form onSubmit={handleResolveTicket} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                    <h3 style={{ fontWeight: 800 }}>Resolve Ticket ID #{ticketReplyForm.ticket_id}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type support reply which will be dynamically notified to user.</p>
                    
                    <textarea 
                      placeholder="Type response reply..." 
                      rows={4}
                      value={ticketReplyForm.reply}
                      onChange={e => setTicketReplyForm(prev => ({ ...prev, reply: e.target.value }))}
                      required
                    />
                    
                    <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                      Transmit Resolution reply <Send size={16} />
                    </button>
                  </form>
                )}

              </div>
            )}

            {/* Messaging campaigns (SMS & WhatsApp logs) */}
            {activePanel === 'messaging' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Send messaging campaign */}
                <form onSubmit={handleDispatchCampaign} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>Broadcast Message Campaign</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Transmit promo codes or notifications to customers via configured FAST2SMS or WhatsApp API keys.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Transmit Platform</label>
                      <select 
                        value={messagingForm.platform}
                        onChange={e => setMessagingForm(prev => ({ ...prev, platform: e.target.value }))}
                      >
                        <option value="SMS">Fast2SMS (SMS)</option>
                        <option value="WhatsApp">WhatsApp Business</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Recipient Target</label>
                      <select 
                        value={messagingForm.recipient}
                        onChange={e => setMessagingForm(prev => ({ ...prev, recipient: e.target.value }))}
                      >
                        <option value="All Customers">All Store Buyers</option>
                        <option value="Active Cart Users">Users with Active Carts</option>
                        <option value="+91 94444 33333">Test Phone (+91 94444 33333)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Message Text</label>
                    <textarea 
                      placeholder="Type promotional text details..." 
                      rows={4}
                      value={messagingForm.message}
                      onChange={e => setMessagingForm(prev => ({ ...prev, message: e.target.value }))}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    Transmit Broadcast Campaign <Send size={16} />
                  </button>
                </form>

                {/* Sent Messages logs */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Campaign Transmission History</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                    {adminSmsLogs.map(l => (
                      <div key={l.id} className="glass-panel" style={{ padding: '16px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{l.platform}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(l.timestamp).toLocaleString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Target: {l.recipient}</p>
                        <p style={{ color: 'var(--text-main)' }}>"{l.message}"</p>
                        <span className="badge badge-success" style={{ marginTop: '6px', fontSize: '0.65rem' }}>{l.status}</span>
                      </div>
                    ))}
                    {adminSmsLogs.length === 0 && (
                      <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No campaigns dispatched yet.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* GST Accounting panel */}
            {activePanel === 'gst_report' && gstReport && (
              <div className="glass-panel animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>GST Tax Accounting Report</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={exportGstExcelReport}
                      className="btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        height: '36px',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={14} /> Export Excel
                    </button>
                    <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      {gstReport.reporting_period}
                    </span>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <Search size={16} style={{ color: 'var(--accent-secondary)' }} /> Search & Filter GST Report
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Filter by Date</label>
                      <input
                        type="date"
                        value={gstFilterDate}
                        onChange={e => {
                          setGstFilterDate(e.target.value);
                          if (e.target.value) {
                            setGstFilterMonth("");
                            setGstFilterYear("");
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(154, 132, 200, 0.3)',
                          background: 'rgba(255, 255, 255, 0.8)',
                          color: 'var(--text-main)',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Filter by Month</label>
                      <select
                        value={gstFilterMonth}
                        onChange={e => {
                          setGstFilterMonth(e.target.value);
                          if (e.target.value) {
                            setGstFilterDate("");
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(154, 132, 200, 0.3)',
                          background: 'rgba(255, 255, 255, 0.8)',
                          color: 'var(--text-main)',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="">All Months</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Filter by Year</label>
                      <select
                        value={gstFilterYear}
                        onChange={e => {
                          setGstFilterYear(e.target.value);
                          if (e.target.value) {
                            setGstFilterDate("");
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(154, 132, 200, 0.3)',
                          background: 'rgba(255, 255, 255, 0.8)',
                          color: 'var(--text-main)',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="">All Years</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                      </select>
                    </div>

                    <div>
                      {(gstFilterDate || gstFilterMonth || gstFilterYear) && (
                        <button
                          onClick={clearGstFilters}
                          className="btn-secondary"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            color: 'var(--accent-secondary)',
                            borderColor: 'var(--accent-secondary)',
                            fontSize: '0.8rem'
                          }}
                        >
                          <X size={14} /> Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aggregates Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross Store Volume</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-main)', marginTop: '4px' }}>₹{gstReport.gross_revenue.toFixed(2)}</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Goods: ₹{(gstReport.gross_revenue - (gstReport.total_shipping_collected || 0)).toFixed(2)} | Shipping: ₹{(gstReport.total_shipping_collected || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Taxable Sales</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-main)', marginTop: '4px' }}>₹{gstReport.net_sales.toFixed(2)}</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Goods Net: ₹{(gstReport.net_goods_sales || 0).toFixed(2)} | Shipping Net: ₹{((gstReport.total_shipping_collected || 0) - (gstReport.total_shipping_gst || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--accent-secondary)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total GST Tax collected</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-secondary)', marginTop: '4px' }}>₹{gstReport.total_gst_collected.toFixed(2)}</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Goods GST: ₹{(gstReport.goods_gst_collected || 0).toFixed(2)} | Shipping GST: ₹{(gstReport.total_shipping_gst || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Detailed transactions table */}
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>Detailed GST Transactions</h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date & Time</th>
                          <th>Customer</th>
                          <th>Tax Type</th>
                          <th style={{ textAlign: 'right' }}>Gross Amount</th>
                          <th style={{ textAlign: 'right' }}>Delivery Charge</th>
                          <th style={{ textAlign: 'right' }}>Delivery GST</th>
                          <th style={{ textAlign: 'right' }}>Net Goods</th>
                          <th style={{ textAlign: 'right' }}>Goods GST</th>
                          <th style={{ textAlign: 'right' }}>Total GST</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstReport.orders && gstReport.orders.map(o => {
                          const orderDelivery = o.shipping_charge || 0;
                          const orderDeliveryGst = o.shipping_gst || 0;
                          const orderTotalGst = o.gst_amount || 0;
                          const orderGoodsGst = orderTotalGst - orderDeliveryGst;
                          const orderNetGoods = o.final_amount - orderDelivery - orderGoodsGst;
                          return (
                            <tr key={o.id}>
                              <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{getDisplayOrderNumber(o)}</td>
                              <td>{o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A'}</td>
                              <td>{o.user_name || 'N/A'}</td>
                              <td>
                                <span className={`badge ${o.gst_inclusive ? 'badge-info' : 'badge-warning'}`}>
                                  {o.gst_inclusive ? 'Inclusive' : 'Exclusive'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>₹{o.final_amount.toFixed(2)}</td>
                              <td style={{ textAlign: 'right' }}>₹{orderDelivery.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>₹{orderDeliveryGst.toFixed(2)}</td>
                              <td style={{ textAlign: 'right' }}>₹{orderNetGoods.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>₹{orderGoodsGst.toFixed(2)}</td>
                              <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)', textAlign: 'right' }}>₹{orderTotalGst.toFixed(2)}</td>
                              <td>
                                <span className={`badge ${
                                  o.status === 'Customer Received' ? 'badge-success' : o.status === 'Dispatched' ? 'badge-info' : o.status === 'Accepted' ? 'badge-info' : o.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {(!gstReport.orders || gstReport.orders.length === 0) && (
                          <tr>
                            <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No GST transactions found for the selected reporting period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '8px' }}>Reporting Aggregates Info</h4>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Active reporting schedule: <strong>{gstReport.reporting_period}</strong></p>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Aggregate GST tariff: <strong>{gstReport.gst_rate_applied}</strong></p>
                  <p style={{ color: 'var(--text-muted)' }}>Invoice sales count: <strong>{gstReport.total_orders_count} successful orders</strong></p>
                </div>
              </div>
            )}

            {/* Customers list panel */}
            {activePanel === 'customers' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Customer Base Manager</h2>
                <div className="responsive-table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Display Name</th>
                        <th>Username ID</th>
                        <th>Email Contact</th>
                        <th>Phone</th>
                        <th>Orders Count</th>
                        <th>Total Purchase spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminCustomers.map(cust => (
                        <tr key={cust.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{cust.name}</td>
                          <td>{cust.username}</td>
                          <td>{cust.email}</td>
                          <td>{cust.contact_phone || "none"}</td>
                          <td style={{ fontWeight: 'bold' }}>{cust.total_orders} sales</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>₹{cust.total_spent.toFixed(2)}</td>
                        </tr>
                      ))}
                      {adminCustomers.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No buyers recorded in this shop database yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePanel === 'customizations' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Customization Orders Manager</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '30px' }}>
                  {/* Left Column: Customization Requests Table */}
                  <div className="responsive-table-container glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '16px', color: '#2b0b57' }}>Request Queue</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Product</th>
                          <th>Bespoke Details</th>
                          <th>Qty</th>
                          <th>Pricing / Quote</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminCustomizations.map(cust => (
                          <tr key={cust.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{getDisplayCustomizationNumber(cust)}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{cust.user_name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.user_email}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={cust.product_image || null} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cust.product_name}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '10px', background: '#f5edff', fontSize: '0.7rem', fontWeight: 600, width: 'fit-content' }}>
                                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: cust.selected_color_hex }} />
                                  {cust.selected_color_name}
                                </span>
                                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#fbf9ff', padding: '6px', borderRadius: '6px', border: '1px solid #f0e6fc' }}>{cust.customization_notes}</pre>
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {cust.quantity || 1}
                            </td>
                            <td>
                              {(!cust.quote_status || cust.quote_status === 'Pending') && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹</span>
                                  <input 
                                    type="number" 
                                    placeholder="0.00 / pc"
                                    value={quoteInputs[cust.id] || ''}
                                    onChange={(e) => setQuoteInputs({ ...quoteInputs, [cust.id]: e.target.value })}
                                    style={{ width: '70px', padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #dcdcdc' }}
                                  />
                                  <button
                                    onClick={() => handleSendQuote(cust.id, quoteInputs[cust.id])}
                                    className="btn-primary"
                                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', color: '#fff', fontWeight: 600 }}
                                  >
                                    Send
                                  </button>
                                </div>
                              )}
                              {cust.quote_status === 'Quoted' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7a4ea5' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting response</span>
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                    <input 
                                      type="number" 
                                      placeholder="New / pc"
                                      value={quoteInputs[cust.id] || ''}
                                      onChange={(e) => setQuoteInputs({ ...quoteInputs, [cust.id]: e.target.value })}
                                      style={{ width: '60px', padding: '4px 6px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #dcdcdc' }}
                                    />
                                    <button
                                      onClick={() => handleSendQuote(cust.id, quoteInputs[cust.id])}
                                      style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#7a4ea5', color: '#fff' }}
                                    >
                                      Update
                                    </button>
                                  </div>
                                </div>
                              )}
                              {cust.quote_status === 'Accepted' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>✓ Accepted</span>
                                </div>
                              )}
                              {cust.quote_status === 'Rejected' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{parseFloat(cust.quoted_price || 0).toFixed(2)} / pc</span>
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textDecoration: 'line-through' }}>Total: ₹{parseFloat((cust.quoted_price * cust.quantity).toString()).toFixed(2)}</span>
                                  <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold' }}>✗ Rejected</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold', 
                                background: cust.status === 'Completed' ? 'rgba(154, 132, 200, 0.15)' : cust.status === 'Rejected' ? 'rgba(232, 78, 126, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                color: cust.status === 'Completed' ? '#7a4ea5' : cust.status === 'Rejected' ? '#e84e7e' : '#b45309',
                                border: '1px solid ' + (cust.status === 'Completed' ? 'rgba(154, 132, 200, 0.3)' : cust.status === 'Rejected' ? 'rgba(232, 78, 126, 0.25)' : 'rgba(251, 191, 36, 0.25)')
                              }}>
                                {cust.status}
                              </span>
                            </td>
                            <td>
                              <select 
                                value={cust.status} 
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const res = await fetch(`${API_BASE}/admin/customizations/${cust.id}`, {
                                      method: 'PUT',
                                      headers: getHeaders(),
                                      body: JSON.stringify({ status: newStatus })
                                    });
                                    if (res.ok) {
                                      addToast("Status Updated", `Customization ${getDisplayCustomizationNumber(cust)} status changed to ${newStatus}.`, "success");
                                      loadAdminCustomizations();
                                    } else {
                                      addToast("Error", "Failed to update status.", "danger");
                                    }
                                  } catch (err) {
                                    addToast("Error", err.message, "danger");
                                  }
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #dcdcdc' }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {adminCustomizations.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No customization requests received yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Configurations & Palette */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Minimum Order Quantity Configurator */}
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '8px', color: '#2b0b57' }}>Minimum Custom Quantity</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Set the minimum product quantity required for customers to place custom order requests.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          value={(adminShop && adminShop.customization_min_quantity) || 1}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setAdminShop(prev => ({ ...prev, customization_min_quantity: val }));
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/admin/shop`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify({ customization_min_quantity: adminShop.customization_min_quantity })
                              });
                              if (res.ok) {
                                addToast("Setting Saved", "Minimum custom order quantity updated.", "success");
                                loadAdminShop();
                              } else {
                                addToast("Save Failed", "Failed to update settings.", "danger");
                              }
                            } catch (err) {
                              addToast("Error", err.message, "danger");
                            }
                          }}
                          className="btn-primary"
                          style={{
                            padding: '10px 16px',
                            fontSize: '0.85rem',
                            background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                            border: 'none',
                            borderRadius: '8px'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Default Return Window (Days) Configurator */}
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '8px', color: '#2b0b57' }}>Default Return Window</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Set the default return window in days for products. This is used if category or product specific window is not defined.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={(adminShop && adminShop.return_window_days !== undefined && adminShop.return_window_days !== null) ? adminShop.return_window_days : 7}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setAdminShop(prev => ({ ...prev, return_window_days: val }));
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/admin/shop`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify({ return_window_days: adminShop.return_window_days })
                              });
                              if (res.ok) {
                                addToast("Setting Saved", "Default return window days updated.", "success");
                                loadAdminShop();
                              } else {
                                addToast("Save Failed", "Failed to update settings.", "danger");
                              }
                            } catch (err) {
                              addToast("Error", err.message, "danger");
                            }
                          }}
                          className="btn-primary"
                          style={{
                            padding: '10px 16px',
                            fontSize: '0.85rem',
                            background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)',
                            border: 'none',
                            borderRadius: '8px'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Store Color Palette configurator */}
                    <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '16px', color: '#2b0b57' }}>Store Color Palette</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Define the available color choices for custom tailoring orders.</p>
                      
                      {/* List of current colors */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        {(adminShop.color_palette || []).map((color, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fcfaff', borderRadius: '8px', border: '1px solid #f0e6fc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: color.hex, border: '1px solid #ddd' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{color.name}</span>
                              <span style={{ fontSize: '0.75rem', color: '#888' }}>({color.hex})</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                const updatedPalette = (adminShop.color_palette || []).filter((_, i) => i !== idx);
                                setAdminShop(prev => ({ ...prev, color_palette: updatedPalette }));
                              }}
                              style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: 0 }}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                        {(adminShop.color_palette || []).length === 0 && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No colors added yet.</p>
                        )}
                      </div>

                      {/* Form to add a new color */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f0e6fc', paddingTop: '16px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2b0b57', margin: 0 }}>Add New Color</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="Color Name (e.g. Royal Gold)"
                            id="new-color-name"
                            style={{ padding: '8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Color Code (e.g. #7a4ea5, rgb(...), gold)"
                              id="new-color-hex"
                              defaultValue="#7a4ea5"
                              style={{ flex: 3, padding: '8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                            />
                            <input 
                              type="color" 
                              id="new-color-picker"
                              defaultValue="#7a4ea5"
                              onChange={e => {
                                const hexInput = document.getElementById("new-color-hex");
                                if (hexInput) hexInput.value = e.target.value;
                              }}
                              style={{ flex: 1, padding: '0', height: '34px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const nameInput = document.getElementById("new-color-name");
                            const hexInput = document.getElementById("new-color-hex");
                            if (!nameInput || !nameInput.value.trim()) {
                              addToast("Name Required", "Please enter a color name.", "warning");
                              return;
                            }
                            if (!hexInput || !hexInput.value.trim()) {
                              addToast("Code Required", "Please enter a color code.", "warning");
                              return;
                            }
                            const newColor = {
                              name: nameInput.value.trim(),
                              hex: hexInput.value.trim()
                            };
                            const updatedPalette = [...(adminShop.color_palette || []), newColor];
                            setAdminShop(prev => ({ ...prev, color_palette: updatedPalette }));
                            nameInput.value = "";
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px', justifyContent: 'center', fontSize: '0.8rem' }}
                        >
                          Add to Palette
                        </button>

                        {/* Save Palette Button */}
                        <button 
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_BASE}/admin/shop`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify({ color_palette: adminShop.color_palette })
                              });
                              if (res.ok) {
                                addToast("Palette Saved", "Your custom color palette has been updated.", "success");
                                loadAdminShop();
                              } else {
                                addToast("Save Failed", "Failed to update color palette.", "danger");
                              }
                            } catch (err) {
                              addToast("Error", err.message, "danger");
                            }
                          }}
                          className="btn-primary"
                          style={{ padding: '10px', justifyContent: 'center', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', border: 'none', fontSize: '0.85rem' }}
                        >
                          Save Palette
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Customizable Catalog Configurations */}
                <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginTop: '10px', background: '#ffffff', borderRadius: '16px', border: '1px solid #f0e6fc', boxShadow: '0 8px 30px rgba(122, 78, 165, 0.04)' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#2b0b57', marginBottom: '8px', borderBottom: '1px solid #f0e6fc', paddingBottom: '12px', fontFamily: 'var(--font-serif)' }}>Configure Customizable Catalog</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Select which categories and individual products are allowed to be customized by customers on the Bespoke Customization page.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '30px' }}>
                    
                    {/* Category Customization Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2b0b57', margin: 0, fontFamily: 'var(--font-serif)' }}>Category Customization</h4>
                      <div className="responsive-table-container" style={{ border: '1px solid #f0e6fc', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ margin: 0 }}>
                          <thead>
                            <tr style={{ background: '#fcfaff' }}>
                              <th>Category</th>
                              <th style={{ textAlign: 'right' }}>Customization</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminCategories.map(cat => (
                              <tr key={cat.id}>
                                <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat.name}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newVal = !cat.customization_enabled;
                                      try {
                                        const res = await fetch(`${API_BASE}/admin/categories/${cat.id}`, {
                                          method: 'PUT',
                                          headers: getHeaders(),
                                          body: JSON.stringify({ customization_enabled: newVal })
                                        });
                                        if (res.ok) {
                                          addToast("Updated", `Customization ${newVal ? 'enabled' : 'disabled'} for category '${cat.name}'.`, "success");
                                          loadAdminCategories();
                                        } else {
                                          addToast("Update Failed", "Failed to update category customization status.", "danger");
                                        }
                                      } catch (err) {
                                        addToast("Error", err.message, "danger");
                                      }
                                    }}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '0.75rem',
                                      borderRadius: '20px',
                                      background: cat.customization_enabled ? 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)' : '#e5e7eb',
                                      color: cat.customization_enabled ? '#fff' : '#4b5563',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      boxShadow: cat.customization_enabled ? '0 2px 8px rgba(122,78,165,0.15)' : 'none',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {cat.customization_enabled ? "✓ Enabled" : "Disabled"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {adminCategories.length === 0 && (
                              <tr>
                                <td colSpan="2" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No categories created yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Product Customization Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2b0b57', margin: 0, fontFamily: 'var(--font-serif)' }}>Product Customization</h4>
                      <div className="responsive-table-container" style={{ border: '1px solid #f0e6fc', borderRadius: '8px', overflow: 'hidden', maxHeight: '350px', overflowY: 'auto' }}>
                        <table style={{ margin: 0 }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fcfaff' }}>
                            <tr>
                              <th>Product</th>
                              <th>Category</th>
                              <th style={{ textAlign: 'right' }}>Customization</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminProducts.map(p => (
                              <tr key={p.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img src={p.images[0] || null} alt="" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.category_name}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newVal = !p.customization_enabled;
                                      try {
                                        const res = await fetch(`${API_BASE}/admin/products/${p.id}`, {
                                          method: 'PUT',
                                          headers: getHeaders(),
                                          body: JSON.stringify({ customization_enabled: newVal })
                                        });
                                        if (res.ok) {
                                          addToast("Updated", `Customization ${newVal ? 'enabled' : 'disabled'} for product '${p.name}'.`, "success");
                                          loadAdminProducts();
                                        } else {
                                          addToast("Update Failed", "Failed to update product customization status.", "danger");
                                        }
                                      } catch (err) {
                                        addToast("Error", err.message, "danger");
                                      }
                                    }}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: '0.75rem',
                                      borderRadius: '20px',
                                      background: p.customization_enabled ? 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)' : '#e5e7eb',
                                      color: p.customization_enabled ? '#fff' : '#4b5563',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      boxShadow: p.customization_enabled ? '0 2px 8px rgba(122,78,165,0.15)' : 'none',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {p.customization_enabled ? "✓ Enabled" : "Disabled"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {adminProducts.length === 0 && (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No products in catalog yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Logs Audit panel */}
            {activePanel === 'logs' && (() => {
              const filteredLogs = adminLogs.filter(l => {
                if (adminLogTab === 'all') return true;
                const isSmtp = l.action && l.action.startsWith('[SMTP]');
                if (adminLogTab === 'smtp') return isSmtp;
                if (adminLogTab === 'system') return !isSmtp;
                return true;
              });

              return (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Store System Logs</h2>
                    
                    {/* Log Filter Tabs */}
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(154, 132, 200, 0.05)', 
                      padding: '4px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-subtle)' 
                    }}>
                      <button 
                        onClick={() => setAdminLogTab('all')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: adminLogTab === 'all' ? 'var(--accent-primary)' : 'transparent',
                          color: adminLogTab === 'all' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        All Activities
                      </button>
                      <button 
                        onClick={() => setAdminLogTab('system')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: adminLogTab === 'system' ? 'var(--accent-primary)' : 'transparent',
                          color: adminLogTab === 'system' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        System Activity
                      </button>
                      <button 
                        onClick={() => setAdminLogTab('smtp')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: adminLogTab === 'smtp' ? 'var(--accent-primary)' : 'transparent',
                          color: adminLogTab === 'smtp' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Mail size={14} /> SMTP Emails
                      </button>
                    </div>
                  </div>

                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Actor</th>
                          <th>Store ID</th>
                          <th>System Activity Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map(l => (
                          <tr key={l.id}>
                            <td>{new Date(l.created_at).toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{l.username} (<span style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{l.actor_type}</span>)</td>
                            <td>{l.shop_id || "Global Core"}</td>
                            <td>{renderLogDescription(l.action)}</td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No log entries found for this category.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </main>
        </div>
      )}

      {/* RENDER VIEW 4: SUPER ADMIN VIEW */}
      {currentView === 'super_admin_dashboard' && role === 'super_admin' && (
        <div className="dashboard-grid">
          <aside className="sidebar">
            <div className="sidebar-header" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', padding: '0 8px' }}>
              <ShieldAlert style={{ color: 'var(--accent-danger)' }} />
              <div>
                <h5 style={{ fontWeight: 800 }}>Super Admin</h5>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Portal Console</span>
              </div>
            </div>

            <span className={`sidebar-link ${activePanel === 'shop_creation' ? 'active' : ''}`} onClick={() => { setActivePanel("shop_creation"); setShopForm({ id: null, name: "", logo_url: "", contact_email: "", contact_phone: "", privacy_policy: "", address: "", sms_api_key: "", whatsapp_api_key: "", razorpay_key_id: "", razorpay_key_secret: "", super_coin_enabled: true, super_coin_ratio: 10, gst_percentage: 18.0, gst_inclusive: false }); }}>
              <Plus size={18} /> Shop Provisioning
            </span>
            <span className={`sidebar-link ${activePanel === 'admin_creation' ? 'active' : ''}`} onClick={() => setActivePanel("admin_creation")}>
              <User size={18} /> Admin Accounts Allocation
            </span>
            <span className={`sidebar-link ${activePanel === 'customers' ? 'active' : ''}`} onClick={() => setActivePanel("customers")}>
              <User size={18} /> Customer Accounts
            </span>
            <span className={`sidebar-link ${activePanel === 'orders' ? 'active' : ''}`} onClick={() => setActivePanel("orders")}>
              <ShoppingBag size={18} /> System Orders
            </span>
            <span className={`sidebar-link ${activePanel === 'audit_logs' ? 'active' : ''}`} onClick={() => setActivePanel("audit_logs")}>
              <FileText size={18} /> Absolute Audit Logs
            </span>
            <span className="sidebar-link logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </span>
          </aside>

          <main className="main-content">
            
            {/* Shop creation and list */}
            {activePanel === 'shop_creation' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Create/Edit Shop form */}
                <form onSubmit={shopForm.id ? handleUpdateShopConfig : handleCreateShop} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{shopForm.id ? "Global Shop Customization" : "Create New Shop Platform"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Shop Name Title</label>
                    <input 
                      type="text" 
                      value={shopForm.name}
                      onChange={e => setShopForm(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Branding Logo Image</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {shopForm.logo_url && (
                        <img src={shopForm.logo_url} alt="Shop Logo Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        style={{ border: 'none', padding: '4px 0', cursor: 'pointer' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadFile(file, (url) => {
                              setShopForm(prev => ({ ...prev, logo_url: url }));
                            });
                          }
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="Logo path URL (automatically filled after upload)"
                        value={shopForm.logo_url}
                        onChange={e => setShopForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                      <input 
                        type="email" 
                        value={shopForm.contact_email}
                        onChange={e => setShopForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
                      <input 
                        type="text" 
                        value={shopForm.contact_phone}
                        onChange={e => setShopForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Privacy Policy Text</label>
                    <textarea 
                      value={shopForm.privacy_policy}
                      onChange={e => setShopForm(prev => ({ ...prev, privacy_policy: e.target.value }))}
                      rows={2} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Shop Address (Displayed on Tax Invoices)</label>
                    <textarea 
                      placeholder="Enter physical shop address"
                      value={shopForm.address || ""}
                      onChange={e => setShopForm(prev => ({ ...prev, address: e.target.value }))}
                      rows={2} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px' }}
                        checked={shopForm.super_coin_enabled}
                        onChange={e => setShopForm(prev => ({ ...prev, super_coin_enabled: e.target.checked }))}
                      />
                      <span style={{ fontSize: '0.75rem' }}>Enable Super Coins</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Ratio spent per coin (₹)</label>
                      <input 
                        type="number" 
                        value={shopForm.super_coin_ratio}
                        onChange={e => setShopForm(prev => ({ ...prev, super_coin_ratio: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>GST Percentage (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="100"
                        value={shopForm.gst_percentage !== undefined && shopForm.gst_percentage !== null ? shopForm.gst_percentage : 18.0}
                        onChange={e => setShopForm(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0.0 }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>GST Tax Type</label>
                      <select 
                        value={shopForm.gst_inclusive ? 'inclusive' : 'exclusive'}
                        onChange={e => setShopForm(prev => ({ ...prev, gst_inclusive: e.target.value === 'inclusive' }))}
                      >
                        <option value="exclusive">Exclusive</option>
                        <option value="inclusive">Inclusive</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '10px' }}>
                    {shopForm.id ? "Overwite Global Configurations" : "Provision Shop"} <Check size={16} />
                  </button>
                </form>

                {/* Provisioned Shops list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Provisioned Shop Platforms</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {superShops.map(s => (
                      <div key={s.id} className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <img src={s.logo_url || null} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flexGrow: 1 }}>
                          <h4 style={{ fontWeight: 800 }}>{s.name}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Email: {s.contact_email} | Phone: {s.contact_phone}</p>
                          <span className={`badge ${s.super_coin_enabled ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '6px', fontSize: '0.65rem' }}>
                            Coins: {s.super_coin_enabled ? `Ratio ₹${s.super_coin_ratio}` : "Disabled"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => setShopForm(s)} className="btn-secondary" style={{ padding: '6px' }}><Edit2 size={12} /></button>
                          <button onClick={() => handleDeleteShop(s.id)} className="btn-danger" style={{ padding: '6px' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Admin accounts allocation */}
            {activePanel === 'admin_creation' && (
              <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Create Admin form */}
                <form onSubmit={handleCreateAdmin} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <h3 style={{ fontWeight: 800 }}>{newAdminForm.id ? "Edit Store Administrator" : "Allocate Store Administrator"}</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Target Shop</label>
                    <select 
                      value={newAdminForm.shop_id}
                      onChange={e => setNewAdminForm(prev => ({ ...prev, shop_id: e.target.value }))}
                      required
                    >
                      <option value="">Choose Shop Platform...</option>
                      {superShops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Admin Username ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g., tech_hub_admin"
                      value={newAdminForm.username}
                      onChange={e => setNewAdminForm(prev => ({ ...prev, username: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Display Name</label>
                    <input 
                      type="text" 
                      placeholder="Aura Tech Admin"
                      value={newAdminForm.name}
                      onChange={e => setNewAdminForm(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contact Email Address</label>
                    <input 
                      type="email" 
                      placeholder="admin@auratech.com"
                      value={newAdminForm.email}
                      onChange={e => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Security Password</label>
                    <input 
                      type="password" 
                      placeholder={newAdminForm.id ? "Leave blank to keep current password" : "admin123"}
                      value={newAdminForm.password}
                      onChange={e => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      required={!newAdminForm.id} 
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    {newAdminForm.id ? "Update Store Administrator" : "Authorize Store Administrator"} <Check size={16} />
                  </button>

                  {newAdminForm.id && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setNewAdminForm({ id: null, username: "", password: "", email: "", name: "", shop_id: "" })}
                      style={{ justifyContent: 'center', marginTop: '4px' }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </form>

                {/* Admins list */}
                <div>
                  <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Authorized Store Administrators</h3>
                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Shop Platform</th>
                          <th>Email Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {superAdmins.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{a.name} ({a.username})</td>
                            <td><span className="badge badge-info">{a.shop_name}</span></td>
                            <td>{a.email}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  type="button"
                                  onClick={() => setNewAdminForm({ id: a.id, username: a.username, password: "", email: a.email, name: a.name || "", shop_id: a.shop_id })} 
                                  className="btn-secondary" 
                                  style={{ padding: '6px' }}
                                  title="Edit Admin"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteAdmin(a.id)} 
                                  className="btn-danger" 
                                  style={{ padding: '6px' }}
                                  title="Delete Admin"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Platform-wide Orders list */}
            {activePanel === 'orders' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.8rem' }}>Global Sales Ledger</h2>
                <div className="responsive-table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Shop Name</th>
                        <th>Customer</th>
                        <th>Gross Value</th>
                        <th>Tax Inclusive</th>
                        <th>Date & Time</th>
                        <th>Status State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {superOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{getDisplayOrderNumber(o)}</td>
                          <td style={{ fontWeight: 'bold' }}>{o.shop_name}</td>
                          <td>{o.user_name}</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>₹{o.final_amount}</td>
                          <td>₹{o.gst_amount} (GST)</td>
                          <td>{new Date(o.created_at).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${
                              o.status === 'Customer Received' ? 'badge-success' : o.status === 'Dispatched' ? 'badge-info' : o.status === 'Accepted' ? 'badge-info' : o.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Absolute Audit logs */}
            {activePanel === 'audit_logs' && (() => {
              const filteredLogs = superLogs.filter(l => {
                if (superLogTab === 'all') return true;
                const isSmtp = l.action && l.action.startsWith('[SMTP]');
                if (superLogTab === 'smtp') return isSmtp;
                if (superLogTab === 'system') return !isSmtp;
                return true;
              });

              return (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Absolute Audit Logs</h2>

                    {/* Log Filter Tabs */}
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(154, 132, 200, 0.05)', 
                      padding: '4px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-subtle)' 
                    }}>
                      <button 
                        onClick={() => setSuperLogTab('all')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: superLogTab === 'all' ? 'var(--accent-primary)' : 'transparent',
                          color: superLogTab === 'all' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        All Activities
                      </button>
                      <button 
                        onClick={() => setSuperLogTab('system')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: superLogTab === 'system' ? 'var(--accent-primary)' : 'transparent',
                          color: superLogTab === 'system' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        System Activity
                      </button>
                      <button 
                        onClick={() => setSuperLogTab('smtp')} 
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: superLogTab === 'smtp' ? 'var(--accent-primary)' : 'transparent',
                          color: superLogTab === 'smtp' ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Mail size={14} /> SMTP Emails
                      </button>
                    </div>
                  </div>

                  <div className="responsive-table-container glass-panel">
                    <table>
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Actor</th>
                          <th>Store ID</th>
                          <th>System Activity Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map(l => (
                          <tr key={l.id}>
                            <td>{new Date(l.created_at).toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{l.username} (<span style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{l.actor_type}</span>)</td>
                            <td>{l.shop_id || "Global Core"}</td>
                            <td>{renderLogDescription(l.action)}</td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No log entries found for this category.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Customer accounts list */}
            {activePanel === 'customers' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Customer Directory</h2>
                  <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-glass)', borderRadius: '24px', border: '1px solid var(--border-subtle)', width: '320px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search by name, email, phone, ID..." 
                      style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-main)' }} 
                      value={superCustomerSearch}
                      onChange={e => setSuperCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="responsive-table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Display Name</th>
                        <th>Email Address</th>
                        <th>Contact Phone</th>
                        <th>Super Coins</th>
                        <th>Date Registered</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {superCustomers.filter(c => {
                        const q = superCustomerSearch.toLowerCase();
                        return (c.username || "").toLowerCase().includes(q) ||
                               (c.name || "").toLowerCase().includes(q) ||
                               (c.email || "").toLowerCase().includes(q) ||
                               (c.contact_phone || "").toLowerCase().includes(q) ||
                               c.id.toString().includes(q);
                      }).length > 0 ? (
                        superCustomers.filter(c => {
                          const q = superCustomerSearch.toLowerCase();
                          return (c.username || "").toLowerCase().includes(q) ||
                                 (c.name || "").toLowerCase().includes(q) ||
                                 (c.email || "").toLowerCase().includes(q) ||
                                 (c.contact_phone || "").toLowerCase().includes(q) ||
                                 c.id.toString().includes(q);
                        }).map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{c.id}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{c.username}</td>
                            <td>{c.name || <em style={{ color: 'var(--text-muted)' }}>Not Set</em>}</td>
                            <td>{c.email}</td>
                            <td>{c.contact_phone || <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>N/A</span>}</td>
                            <td>
                              <span className="badge badge-success" style={{ fontWeight: 'bold' }}>
                                {c.super_coins} Coins
                              </span>
                            </td>
                            <td>{c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button"
                                onClick={() => handleDeleteCustomer(c.id)} 
                                className="btn-danger" 
                                style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                                title="Delete Customer Account"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No customer accounts found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* PREMIUM SLIDING CART DRAWER OVERLAY */}
      {showCartDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setShowCartDrawer(false)}>
          <div style={{
            width: '460px',
            maxWidth: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            color: '#111111',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '24px'
          }} onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eeeeee', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ShoppingBag size={22} style={{ color: '#111111' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Shopping Bag ({cart.length})</h3>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', transition: 'color 0.2s' }}>
                <X size={24} />
              </button>
            </div>

            {/* Drawer Body (Scrollable Cart items list) */}
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
              {cart.length > 0 ? (
                cart.map(ci => (
                  <div key={ci.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f6f6f6', paddingBottom: '16px', alignItems: 'center' }}>
                    <img src={ci.product.images[0] || null} alt="" style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eeeeee' }} />
                    <div style={{ flexGrow: 1 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111111', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ci.product.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#888888', display: 'block', marginBottom: '8px' }}>Store: {ci.product.shop_id}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dddddd', borderRadius: '4px' }}>
                          <button style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => handleAddToCart(ci.product_id, Math.max(1, ci.quantity - 1), false)}>-</button>
                          <span style={{ padding: '0 8px', fontSize: '0.85rem', fontWeight: 600 }}>{ci.quantity}</span>
                          <button style={{ border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => handleAddToCart(ci.product_id, ci.quantity + 1, false)}>+</button>
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#111111' }}>₹{ci.product.price * ci.quantity}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveFromCart(ci.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', alignSelf: 'center' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: '#888888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <ShoppingBag size={48} style={{ color: '#cccccc' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Your shopping bag is empty.</p>
                  <button onClick={() => setShowCartDrawer(false)} style={{ border: '1px solid #111111', background: 'none', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>Continue Shopping</button>
                </div>
              )}
            </div>

            {/* Drawer Footer (Subtotal and Action buttons) */}
            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid #eeeeee', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: '#888888' }}>Estimated Subtotal</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111111' }}>₹{cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)}</span>
                </div>
                <button onClick={() => {
                  setShowCartDrawer(false);
                  if (role === 'user') {
                    setCurrentView("user_dashboard");
                    setActivePanel("cart");
                  } else {
                    setLoginRoleTab("user");
                    setShowLoginModal(true);
                    addToast("Checkout", "Please log in to finalize your purchase order.", "warning");
                  }
                }} style={{ width: '100%', backgroundColor: '#000000', color: '#ffffff', border: 'none', padding: '16px', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  Proceed to Checkout <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PREMIUM SLIDING WISHLIST DRAWER OVERLAY */}
      {showWishlistDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setShowWishlistDrawer(false)}>
          <div style={{
            width: '460px',
            maxWidth: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            color: '#111111',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '24px'
          }} onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eeeeee', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Heart size={22} style={{ color: '#ff4d4f', fill: '#ff4d4f' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>My Wishlist ({wishlist.length})</h3>
              </div>
              <button onClick={() => setShowWishlistDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', transition: 'color 0.2s' }}>
                <X size={24} />
              </button>
            </div>

            {/* Drawer Body (Scrollable items list) */}
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
              {wishlist.length > 0 ? (
                wishlist.map(wi => (
                  <div key={wi.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f6f6f6', paddingBottom: '16px', alignItems: 'center' }}>
                    <img src={wi.product.images[0] || null} alt="" style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eeeeee' }} />
                    <div style={{ flexGrow: 1 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111111', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{wi.product.name}</h4>
                      <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#111111', display: 'block', marginBottom: '12px' }}>₹{wi.product.price}</span>
                      <button onClick={() => {
                        handleAddToCart(wi.product_id);
                        handleRemoveFromWishlist(wi.id);
                      }} style={{ backgroundColor: '#111111', color: '#ffffff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Add To Bag <ShoppingBag size={12} />
                      </button>
                    </div>
                    <button onClick={() => handleRemoveFromWishlist(wi.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', alignSelf: 'center' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: '#888888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <Heart size={48} style={{ color: '#cccccc' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Your wishlist is empty.</p>
                  <button onClick={() => setShowWishlistDrawer(false)} style={{ border: '1px solid #111111', background: 'none', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>Browse Products</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="mobile-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '60px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(122, 78, 165, 0.1)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
        display: 'none', // Overridden in CSS media query
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 9999,
        paddingBottom: 'safe-area-inset-bottom'
      }}>
        {/* Home Item */}
        <button 
          onClick={() => {
            setCurrentView("opac");
            setActiveCategoryPage(null);
            setSelectedCategory("");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentView === 'opac' && !activeCategoryPage ? '#7a4ea5' : '#666666',
            cursor: 'pointer',
            gap: '3px'
          }}
        >
          <Home size={20} style={{ color: currentView === 'opac' && !activeCategoryPage ? '#7a4ea5' : '#666666' }} />
          <span style={{ fontSize: '0.65rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Home</span>
        </button>

        {/* Search Item */}
        <button 
          onClick={() => {
            setCurrentView("opac");
            setActiveCategoryPage(null);
            setTimeout(() => {
              const catalog = document.getElementById("catalog-section");
              if (catalog) {
                catalog.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                  document.getElementById("search-input")?.focus();
                }, 500);
              }
            }, 100);
          }}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666666',
            cursor: 'pointer',
            gap: '3px'
          }}
        >
          <Search size={20} />
          <span style={{ fontSize: '0.65rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Search</span>
        </button>

        {/* Wishlist Item */}
        <button 
          onClick={() => setShowWishlistDrawer(true)}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666666',
            cursor: 'pointer',
            position: 'relative',
            gap: '3px'
          }}
        >
          <Heart size={20} style={{ fill: wishlist.length > 0 ? '#ff4d4f' : 'none', color: wishlist.length > 0 ? '#ff4d4f' : '#666666' }} />
          {wishlist.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '12px',
              background: '#ff4d4f',
              color: 'white',
              borderRadius: '50%',
              width: '14px',
              height: '14px',
              fontSize: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>{wishlist.length}</span>
          )}
          <span style={{ fontSize: '0.65rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Wishlist</span>
        </button>

        {/* Cart Item */}
        <button 
          onClick={() => setShowCartDrawer(true)}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666666',
            cursor: 'pointer',
            position: 'relative',
            gap: '3px'
          }}
        >
          <ShoppingBag size={20} />
          {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '2px',
              background: '#7a4ea5',
              color: '#ffffff',
              fontSize: '0.6rem',
              fontWeight: 700,
              borderRadius: '50%',
              width: '15px',
              height: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
          <span style={{ fontSize: '0.65rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Cart</span>
        </button>

        {/* Profile Item */}
        <button 
          onClick={() => {
            if (role === 'guest') {
              setLoginRoleTab("user");
              setShowLoginModal(true);
            } else {
              setCurrentView(role === 'user' ? "user_dashboard" : role === 'admin' ? "admin_dashboard" : "super_admin_dashboard");
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: role !== 'guest' ? '#7a4ea5' : '#666666',
            cursor: 'pointer',
            gap: '3px'
          }}
        >
          <User size={20} style={{ color: role !== 'guest' ? '#7a4ea5' : '#666666' }} />
          <span style={{ fontSize: '0.65rem', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Account</span>
        </button>
      </div>

      {/* Review Image Lightbox Modal */}
      {activeReviewImagePreview && (
        <div className="ad-modal-backdrop" onClick={() => setActiveReviewImagePreview(null)} style={{ zIndex: 12000, backgroundColor: 'rgba(12, 5, 20, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="lightbox-container" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setActiveReviewImagePreview(null)} style={{ position: 'absolute', top: '-48px', right: '0', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#ffffff', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <X size={24} />
            </button>
            <img src={activeReviewImagePreview} alt="Review attachment" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}

      {/* Share Product Modal */}
      {sharingProduct && (
        <div className="ad-modal-backdrop" onClick={() => setSharingProduct(null)} style={{ zIndex: 11000, backgroundColor: 'rgba(12, 5, 20, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="customization-modal-container" onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.15)', position: 'relative', padding: '30px', maxWidth: '420px', width: '90%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <button onClick={() => setSharingProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', zIndex: 100, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 800, color: '#2b0b57', margin: '0 0 4px 0' }}>Share this Saree</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Spread the elegance with friends and family</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', background: '#fcfaff', padding: '12px', borderRadius: '12px', border: '1px solid #f0e6fc' }}>
              <img src={sharingProduct.images[0] || null} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#222222', margin: '0 0 4px 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sharingProduct.name}</h4>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7a4ea5' }}>₹{sharingProduct.price.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {/* WhatsApp */}
              <button
                onClick={() => {
                  const text = encodeURIComponent(`Check out this beautiful saree: ${sharingProduct.name} at ₹${sharingProduct.price}! ${window.location.origin}?product=${sharingProduct.id}`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: 'none', borderRadius: '10px', background: '#25D366', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                WhatsApp
              </button>

              {/* Facebook */}
              <button
                onClick={() => {
                  const url = encodeURIComponent(`${window.location.origin}?product=${sharingProduct.id}`);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: 'none', borderRadius: '10px', background: '#1877F2', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Facebook
              </button>

              {/* Twitter / X */}
              <button
                onClick={() => {
                  const url = encodeURIComponent(`${window.location.origin}?product=${sharingProduct.id}`);
                  const text = encodeURIComponent(`Check out this beautiful saree style: ${sharingProduct.name}!`);
                  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: 'none', borderRadius: '10px', background: '#000000', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Twitter / X
              </button>

              {/* Copy Link */}
              <button
                onClick={() => {
                  const link = `${window.location.origin}?product=${sharingProduct.id}`;
                  navigator.clipboard.writeText(link);
                  addToast("Link Copied!", "Product link copied to clipboard.", "success");
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '1px solid #7a4ea5', borderRadius: '10px', background: '#ffffff', color: '#7a4ea5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fcfaff'}
                onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
              >
                Copy Link
              </button>
            </div>

            {navigator.share && (
              <button
                onClick={() => {
                  navigator.share({
                    title: sharingProduct.name,
                    text: `Check out this beautiful saree: ${sharingProduct.name}`,
                    url: `${window.location.origin}?product=${sharingProduct.id}`
                  }).catch(() => {});
                }}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '0.9rem', justifyContent: 'center', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
              >
                More Apps...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customization Details Selection Modal */}
      {customizingProduct && (
        <div className="ad-modal-backdrop" onClick={() => setCustomizingProduct(null)} style={{ zIndex: 11000, backgroundColor: 'rgba(12, 5, 20, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="customization-modal-container" onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button onClick={() => setCustomizingProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f5edff', border: 'none', cursor: 'pointer', color: '#7a4ea5', zIndex: 100, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>

            {/* Left Side: Product Preview */}
            <div className="customization-modal-left" style={{ background: '#fbf9ff', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '240px', overflow: 'hidden', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', marginBottom: '16px', background: '#ffffff' }}>
                <img src={customizingProduct.images[0] || null} alt={customizingProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: '#2b0b57', textAlign: 'center', margin: '0 0 6px' }}>{customizingProduct.name}</h4>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7a4ea5' }}>₹{customizingProduct.price.toFixed(2)}</span>
            </div>

            {/* Right Side: Customization Form */}
            <div className="customization-modal-right" style={{ padding: '35px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: '#2b0b57', margin: '0 0 4px' }}>Bespoke Order Details</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Configure tailoring options below</p>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#2b0b57', marginBottom: '8px' }}>Select Design Color Palette</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(currentShop?.color_palette || [
                    {"name": "Royal Gold", "hex": "#D4AF37"},
                    {"name": "Noble Lavender", "hex": "#7a4ea5"},
                    {"name": "Crimson Ruby", "hex": "#E84E7E"},
                    {"name": "Midnight Indigo", "hex": "#2b0b57"},
                    {"name": "Forest Green", "hex": "#228B22"},
                    {"name": "Turquoise Teal", "hex": "#008080"}
                  ]).map((c, idx) => {
                    const isSelected = selectedCustomColor?.hex === c.hex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCustomColor(c)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: '2px solid ' + (isSelected ? '#7a4ea5' : 'var(--border-subtle)'),
                          background: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(122,78,165,0.15)' : 'none'
                        }}
                      >
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: c.hex }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sizing & Custom Notes Textarea */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#2b0b57', marginBottom: '6px' }}>Tailoring Measurements & Sizing Notes</label>
                <textarea
                  rows="4"
                  value={customSizingNotes}
                  onChange={e => setCustomSizingNotes(e.target.value)}
                  placeholder="Please specify custom tailoring details here, e.g.:
- Chest Size: 38 inches
- Waist Size: 32 inches
- Shoulder Width: 16 inches
- Saree Blouse Style: Round Neck / Elbow Sleeve
- Any other requests..."
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid #dcdcdc',
                    padding: '12px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'none',
                    minHeight: '110px'
                  }}
                  required
                />
              </div>

              {/* Quantity Selector */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#2b0b57', marginBottom: '6px' }}>
                  Quantity (Minimum: {currentShop?.customization_min_quantity || 1})
                </label>
                <input
                  type="number"
                  min={currentShop?.customization_min_quantity || 1}
                  value={customQuantity}
                  onChange={e => setCustomQuantity(Math.max(currentShop?.customization_min_quantity || 1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid #dcdcdc',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div className="customization-actions" style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCustomizingProduct(null)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingCustomOrder}
                  onClick={async () => {
                    if (!selectedCustomColor) {
                      addToast("Color Required", "Please select a color option.", "warning");
                      return;
                    }
                    if (!customSizingNotes.trim()) {
                      addToast("Notes Required", "Please specify custom sizing notes.", "warning");
                      return;
                    }
                    setSubmittingCustomOrder(true);
                    try {
                      const res = await fetch(`${API_BASE}/user/customizations`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({
                          shop_id: customizingProduct.shop_id,
                          product_id: customizingProduct.id,
                          color_name: selectedCustomColor.name,
                          color_hex: selectedCustomColor.hex,
                          customization_notes: customSizingNotes,
                          quantity: customQuantity
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        addToast("Success!", "Bespoke customization request submitted successfully.", "success");
                        setCustomizingProduct(null);
                        loadUserCustomizations();
                      } else {
                        addToast("Request Failed", data.error || "Failed to submit request.", "danger");
                      }
                    } catch (err) {
                      addToast("Error", err.message, "danger");
                    } finally {
                      setSubmittingCustomOrder(false);
                    }
                  }}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', padding: '10px', background: 'linear-gradient(135deg, #7a4ea5 0%, #56337a 100%)', border: 'none' }}
                >
                  {submittingCustomOrder ? 'Submitting...' : 'Submit Bespoke Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
