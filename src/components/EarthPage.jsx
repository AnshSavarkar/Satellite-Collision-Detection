import React, { useRef, useEffect, useState } from 'react';
import { startStarfield } from './starfield.jsx';
import { Box, Typography, Button, Avatar, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Ensure Orbitron is available if not already loaded globally (no-op if duplicates)
(() => {
  const exists = Array.from(document.styleSheets).some((s) =>
    (s.ownerNode?.href || '').includes('fonts.googleapis.com/css2?family=Orbitron')
  );
  if (!exists) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap';
    document.head.appendChild(link);
  }
})();

// Utility: generate a human-like avatar via DiceBear (seeded by username)
function avatarFor(name = 'user') {
  const seed = encodeURIComponent(String(name || 'user'));
  const style = 'notionists'; // human-like; alternatives: 'avataaars', 'adventurer-neutral'
  const params = new URLSearchParams({
    seed,
    backgroundType: 'gradientLinear',
    backgroundColor: 'b6e3f4,c0aede,ffd5dc',
    radius: '50'
  }).toString();
  return `https://api.dicebear.com/7.x/${style}/svg?${params}`;
}

// Earth background animation state (persist across renders)
let earthAnimOffset = Math.random() * 1000;
let earthAnimFrameId = null;

export default function EarthPage() {
  const earthBgRef = useRef(null);
  // Removed satellites overlay
  const navigate = useNavigate();
  const { user, password, logout } = useAuth();
  const [openProfile, setOpenProfile] = useState(false);
  const [revealPw, setRevealPw] = useState(false);

  useEffect(() => {
    let running = true;
    // Start starfield in background
    try {
      startStarfield('earth-starfield-canvas');
    } catch (e) {
      // ignore if not available
    }

    // No satellites overlay

    function animate() {
      if (!running) return;
      earthAnimOffset += 0.08;
      if (earthBgRef.current) {
        earthBgRef.current.style.backgroundPosition = `center calc(100% + ${
          Math.sin(earthAnimOffset / 30) * 10
        }px)`;
        earthBgRef.current.style.backgroundPositionX = `${
          50 + Math.sin(earthAnimOffset / 100) * 2
        }%`;
      }
      earthAnimFrameId = requestAnimationFrame(animate);
    }
    animate();
    // satellites overlay removed
    return () => {
      running = false;
      if (earthAnimFrameId) cancelAnimationFrame(earthAnimFrameId);
      // no overlay resize listener
    };
  }, []);

  // Styles
  const rootSx = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    background: '#05080e',
    overflow: 'hidden',
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const bgSx = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: { xs: '40vh', sm: '54vh' },
    zIndex: 1,
    pointerEvents: 'none',
    filter: 'brightness(1.08) saturate(1.1) drop-shadow(0 0 32px #00f8ff33)',
    backgroundImage: "url('/earth-bg.png')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center bottom',
    backgroundSize: 'cover',
    transition: 'background-position 0.2s linear',
  };

  const contentSx = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
    textAlign: 'center',
    color: '#fff',
    width: '100vw',
    pointerEvents: 'auto', // ensure children are clickable
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const headingSx = {
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    fontSize: { xs: '2rem', sm: '2.8rem', md: '3.2rem' },
    fontWeight: 900,
    color: '#00eaff',
    textShadow: '0 4px 24px #00eaff33, 0 2px 0 #232a36',
    mb: 3,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    pointerEvents: 'auto',
  };

  const buttonSx = {
    background: 'linear-gradient(90deg, #00eaff 0%, #39e0ff 100%)',
    color: '#181c23',
    fontWeight: 700,
    fontSize: '1.2rem',
    borderRadius: 2,
    py: 1.4,
    px: 5,
    mt: 2,
    boxShadow: '0 2px 8px #00eaff33',
    textTransform: 'uppercase',
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    '&:hover': {
      background: 'linear-gradient(90deg, #39e0ff 0%, #00eaff 100%)',
      boxShadow: '0 4px 16px #00eaff33',
      transform: 'scale(1.06)',
    },
    '&:active': {
      background: '#00eaff',
      transform: 'scale(0.98)',
    },
    pointerEvents: 'auto',
  };

  return (
    <Box sx={rootSx}>
      {/* Starfield background */}
      <canvas
        id="earth-starfield-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      {/* Navbar */}
      <Box className="earth-navbar" sx={{position:'absolute',top:0,left:0,right:0,height:64,display:'flex',alignItems:'center',justifyContent:'space-between',px:5,zIndex:3}}>
        <span className="earth-logo" style={{color:'#fff',fontSize:'1.3rem',fontWeight:700,letterSpacing:2,fontFamily:'Orbitron, monospace'}}>Satellite Collision</span>
        <nav style={{display:'flex',alignItems:'center',gap:32}}>
          {/* <a href="#products" style={{color:'#bfc7d6',textDecoration:'none',fontSize:'1.1rem',fontWeight:500,marginRight:12}}>Products</a> */}
          {/* <a href="#services" style={{color:'#bfc7d6',textDecoration:'none',fontSize:'1.1rem',fontWeight:500,marginRight:12}}>Mission services</a> */}
          {/* <a href="#command" style={{color:'#bfc7d6',textDecoration:'none',fontSize:'1.1rem',fontWeight:500,marginRight:12}}>Command Center</a> */}
          {user ? (
            <Box sx={{ position:'relative', display:'flex', alignItems:'center', gap:1.25 }}>
              <Avatar
                src={avatarFor(user.username)}
                alt={user.username}
                sx={{
                  width:38,
                  height:38,
                  border:'2px solid #00eaff',
                  boxShadow:'0 0 14px #00eaff66',
                  bgcolor:'#0a1220',
                  overflow:'hidden'
                }}
              >
                {user.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Typography
                sx={{
                  fontFamily:'Poppins, Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontWeight:700,
                  letterSpacing:0.6,
                  fontSize:'1rem',
                  background:'linear-gradient(90deg, #00eaff 0%, #39e0ff 100%)',
                  WebkitBackgroundClip:'text',
                  backgroundClip:'text',
                  color:'transparent',
                  textShadow:'0 0 12px rgba(0,234,255,0.25)',
                  cursor:'pointer'
                }}
                title={user.username}
                onClick={() => setOpenProfile((o)=>!o)}
              >
                {user.username}
              </Typography>

              {openProfile && (
                <Box
                  sx={{
                    position:'absolute',
                    top:'calc(100% + 10px)',
                    right:0,
                    minWidth: 280,
                    borderRadius: 10,
                    border: '1px solid #00eaff33',
                    background: 'linear-gradient(180deg, rgba(5,8,14,0.96) 0%, rgba(8,13,22,0.94) 100%)',
                    boxShadow: '0 12px 36px rgba(0, 234, 255, 0.18), inset 0 0 0 1px rgba(0, 234, 255, 0.08)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 30,
                    p: 2
                  }}
                  onMouseLeave={() => { setOpenProfile(false); setRevealPw(false); }}
                >
                  <Box sx={{ display:'flex', alignItems:'center', gap:1.25, mb:1.5 }}>
                    <Avatar src={avatarFor(user?.username)} sx={{ width:40, height:40, border:'2px solid #00eaff' }} />
                    <Box>
                      <Typography sx={{ fontWeight:700, color:'#e6faff' }}>{user?.username}</Typography>
                      <Typography sx={{ fontSize:12, color:'#7aa6b0' }}>Signed in</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ borderColor:'#0f1a28', mb:1.5 }} />
                  <Box sx={{ display:'grid', rowGap:1 }}>
                    <Box>
                      <Typography sx={{ fontSize:11, color:'#7aa6b0' }}>Name</Typography>
                      <Typography sx={{ fontWeight:600, color:'#e6faff' }}>{user?.username || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize:11, color:'#7aa6b0' }}>Email</Typography>
                      <Typography sx={{ fontWeight:600, color:'#e6faff' }}>{user?.email || 'Not set'}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize:11, color:'#7aa6b0' }}>Password</Typography>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Typography sx={{ color:'#e6faff', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize:13 }}>
                          {password ? (revealPw ? password : '••••••••') : 'Not available'}
                        </Typography>
                        {password && (
                          <Button size="small" variant="outlined" onClick={() => setRevealPw((v)=>!v)} sx={{ textTransform:'none', borderColor:'#00eaff55', color:'#9befff', px:1, py:0.1 }}>
                            {revealPw ? 'Hide' : 'Show'}
                          </Button>
                        )}
                      </Box>
                      {!password && (
                        <Typography sx={{ fontSize:11, color:'#7aa6b0', mt:0.25 }}>Password is only visible during this session after login.</Typography>
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ borderColor:'#0f1a28', my:1.25 }} />
                  <Box sx={{ display:'flex', justifyContent:'flex-end', gap:1 }}>
                    <Button onClick={() => { setOpenProfile(false); setRevealPw(false); }} sx={{ textTransform:'none', color:'#9befff' }}>Close</Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => { setOpenProfile(false); setRevealPw(false); logout(); navigate('/earth'); }}
                      sx={{
                        textTransform:'none',
                        bgcolor:'#ef4444',
                        '&:hover': { bgcolor:'#dc2626' },
                        color:'#fff',
                        boxShadow:'0 6px 18px rgba(239,68,68,0.35)'
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Button onClick={() => navigate('/login')} sx={{background:'#2563eb',color:'#fff',borderRadius:2,px:3,py:1.2,fontWeight:700,ml:2,fontSize:'1.1rem',textTransform:'none',boxShadow:'0 2px 8px #2563eb33','&:hover':{background:'#1d4ed8'}}}>Login</Button>
          )}
        </nav>
      </Box>
      {/* Earth background */}
      <Box ref={earthBgRef} sx={bgSx} aria-hidden />
      {/* Satellites overlay removed */}
      {/* Inline profile panel rendered under the username (no center dialog) */}
      {/* Centered Content */}
      <Box sx={contentSx}>
        <Typography sx={{fontSize:'1.3rem',color:'#bfc7d6',mb:2,letterSpacing:1.2,fontWeight:400,fontFamily:'Orbitron, monospace'}}>Predict. Prevent. Protect Space.</Typography>
        <Typography sx={{fontFamily:'Orbitron, monospace',fontSize:{xs:'2.1rem',sm:'3rem',md:'3.2rem'},fontWeight:900,color:'#fff',textShadow:'0 4px 24px #00eaff33, 0 2px 0 #232a36',mb:2,letterSpacing:2.5,textTransform:'none',lineHeight:1.15}}>
          Smart Collision Detection for Space
          {/* <br/>From Build to Launch */}
        </Typography>
        <Button
          sx={{
            fontFamily:'Orbitron, monospace',
            fontSize:'1.3rem',
            fontWeight:700,
            letterSpacing:1.2,
            mt:2,
            color:'#b8ff39',
            background:'none',
            boxShadow:'none',
            textShadow:'0 0 16px #b8ff3933',
            textTransform:'none',
            pointerEvents: 'auto', // ensure button is clickable
            '&:hover':{color:'#fff',background:'none',textShadow:'0 0 24px #b8ff39'}
          }}
          onClick={() => {
            // If user is not logged in, prevent access and send them to login
            if (user) {
              navigate('/dashboard');
            } else {
              navigate('/login');
            }
          }}
        >
          Launch &rarr;
        </Button>
      </Box>
    </Box>
  );
}
