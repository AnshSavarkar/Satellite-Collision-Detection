
import React, { useState, useRef, useEffect } from 'react';
import { startStarfield } from './starfield.jsx';
import { Box, Card, TextField, Button, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginSpaceBackground from './LoginSpaceBackground';
// Orbitron font import (for local dev, ensure font is loaded in index.html or via CDN)
const orbitronFont = document.createElement('link');
orbitronFont.rel = 'stylesheet';
orbitronFont.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap';
document.head.appendChild(orbitronFont);

let starfieldState = null;
let satelliteState = {
  angle: Math.random() * Math.PI * 2,
};

function drawSatellite(ctx, cx, cy, a, b, tilt, angle, size, color) {
  // Elliptical orbit with tilt
  const x =
    cx +
    a * Math.cos(angle) * Math.cos(tilt) -
    b * Math.sin(angle) * Math.sin(tilt);
  const y =
    cy +
    a * Math.cos(angle) * Math.sin(tilt) +
    b * Math.sin(angle) * Math.cos(tilt);

  // Draw orbit ellipse
  ctx.save();
  ctx.strokeStyle = '#ff00ff'; // TEST: bright magenta for visibility
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 4.5; // TEST: thicker line for visibility
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.03) {
    const ox =
      cx +
      a * Math.cos(t) * Math.cos(tilt) -
      b * Math.sin(t) * Math.sin(tilt);
    const oy =
      cy +
      a * Math.cos(t) * Math.sin(tilt) +
      b * Math.sin(t) * Math.cos(tilt);
    if (t === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Draw satellite (simple shape)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + tilt);
  // Body
  ctx.fillStyle = '#b8ff39';
  ctx.fillRect(-size * 0.5, -size * 0.18, size, size * 0.36);
  // Solar panels
  ctx.fillStyle = '#b8ff39';
  ctx.fillRect(-size * 1.2, -size * 0.09, size * 0.7, size * 0.18);
  ctx.fillRect(size * 0.5, -size * 0.09, size * 0.7, size * 0.18);
  // Antenna
  ctx.strokeStyle = '#b8ff39';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size * 0.5);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function LoginPage(props) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    startStarfield('starfield-canvas');
    // Orbit and satellite animation overlay
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let running = true;
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function animate() {
      if (!running) return;
      // Only draw orbit and satellite (starfield is handled by startStarfield)
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const a = Math.min(width, height) * 0.22;
      const b = a * 0.7;
      const tilt = Math.PI / 7;
      satelliteState.angle += 0.008;
      drawSatellite(ctx, cx, cy, a, b, tilt, satelliteState.angle, 32, '#b8ff39');
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      running = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (mode === 'login') {
      if (!username || !password) {
        setError('Please fill all fields.');
        return;
      }
      // Simulate login success (replace with real auth if needed)
      // If you have async login, handle promise and errors here
      let emailFromReg;
      try {
        const raw = localStorage.getItem('user_registry');
        const reg = raw ? JSON.parse(raw) : {};
        emailFromReg = (reg?.[username]?.email) || (reg?.[String(username).toLowerCase()]?.email);
      } catch {}
      try { login(username, emailFromReg, password); } catch (e) {}
      navigate('/earth');
      if (props.onLogin) props.onLogin({ username, password });
    } else {
      if (!username || !regEmail || !password) {
        setError('Please fill all fields.');
        return;
      }
      // Save to a simple local registry (simulated DB)
      try {
        const raw = localStorage.getItem('user_registry');
        const registry = raw ? JSON.parse(raw) : {};
        const exactKey = String(username);
        const lowerKey = String(username).toLowerCase();
        registry[exactKey] = { email: regEmail };
        registry[lowerKey] = { email: regEmail };
        localStorage.setItem('user_registry', JSON.stringify(registry));
      } catch {}

      // Auto-login after successful registration
      try { login(username, regEmail, password); } catch (e) {}
      navigate('/earth');
      if (props.onRegister) props.onRegister({ username, email: regEmail, password });
    }
  };

  // Glassmorphism card style (dark gray, green glow)
  const cardSx = {
    minWidth: { xs: '90vw', sm: 420, md: 680 },
    maxWidth: 1000,
    minHeight: { xs: 480, sm: 520 },
    mx: 'auto',
    my: { xs: 2, sm: 8 },
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    alignItems: 'stretch',
    borderRadius: 5,
    boxShadow: '0 8px 32px #b8ff3933, 0 1.5px 0 #232733',
    background: 'rgba(35, 39, 51, 0.98)',
    backdropFilter: 'blur(18px)',
    border: 'none',
    position: 'relative',
    zIndex: 2,
    overflow: 'visible', // Changed from 'hidden' to show astronaut legs
    transition: 'transform 0.25s cubic-bezier(.23,1.12,.32,1), box-shadow 0.25s cubic-bezier(.23,1.12,.32,1)',
    '&:hover': {
      transform: 'perspective(900px) translateZ(48px) scale(1.04)',
      boxShadow: '0 16px 48px #b8ff3966, 0 4px 24px #232733',
      zIndex: 10,
    },
  };

  // Form column style
  const formColSx = {
    flex: 1,
    px: { xs: 3, sm: 6 },
    py: { xs: 4, sm: 6 },
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: 'rgba(35, 39, 51, 0.98)',
  };

  // Astronaut image column style
  const logoColSx = {
    flex: 1,
    minWidth: 0,
    display: { xs: 'none', md: 'flex' },
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none', // Remove green/dark background
    minHeight: 520,
    position: 'relative',
    overflow: 'visible', // Changed from 'hidden' to show full astronaut
  };

  // Input style
  const inputSx = {
    input: {
      color: '#fff',
      fontFamily: 'Share Tech Mono, Orbitron, Segoe UI, Arial, sans-serif',
      background: 'rgba(35,39,51,0.98)',
      borderRadius: 2,
      border: '1.5px solid #232733',
      fontSize: '1rem',
      px: 1.5,
      py: 1.2,
      transition: 'border 0.2s',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#232733',
      },
      '&:hover fieldset': {
        borderColor: '#b8ff39',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#b8ff39',
      },
    },
    mb: 2,
  };

  // Button style (neon green)
  const buttonSx = {
    background: 'linear-gradient(90deg, #b8ff39 0%, #caff70 100%)',
    color: '#232733',
    fontWeight: 700,
    fontSize: '1.1rem',
    borderRadius: 2,
    py: 1.2,
    mt: 1,
    boxShadow: '0 2px 8px #b8ff3933',
    textTransform: 'uppercase',
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    transition: 'transform 0.22s cubic-bezier(.23,1.12,.32,1), box-shadow 0.22s cubic-bezier(.23,1.12,.32,1)',
    '&:hover': {
      background: 'linear-gradient(90deg, #caff70 0%, #b8ff39 100%)',
      boxShadow: '0 8px 32px #b8ff3933, 0 2px 8px #232733',
      transform: 'perspective(600px) translateZ(24px) scale(1.09)',
    },
    '&:active': {
      background: '#b8ff39',
      transform: 'scale(0.98)',
    },
  };

  // Heading style (neon green)
  const headingSx = {
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    color: '#b8ff39',
    fontSize: { xs: '1.1rem', sm: '1.3rem' },
    fontWeight: 900,
    letterSpacing: 2,
    textShadow: '0 2px 12px #b8ff3933, 0 1px 0 #232733',
    textTransform: 'uppercase',
    mb: 0.5,
  };

  const titleSx = {
    fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
    color: '#fff',
    fontSize: { xs: '1.7rem', sm: '2.3rem' },
    fontWeight: 900,
    letterSpacing: 2.5,
    textShadow: '0 4px 24px #b8ff3933, 0 2px 0 #232733',
    textTransform: 'uppercase',
    mb: 2,
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#181c23',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* Starfield Canvas (background) */}
      <canvas
        id="starfield-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          display: 'block',
          background: '#010910',
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      {/* Orbit/Satellite Canvas (overlay) */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1,
          display: 'block',
          background: 'transparent',
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      {/* Card hover wrapper - only Card pops out */}
      <Box sx={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Card ref={cardRef} sx={cardSx}>
          <Box sx={formColSx}>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography sx={headingSx}>
                {mode === 'login' ? 'Login to' : 'Register for Satellite Portal'}
              </Typography>
              <Typography sx={titleSx}>
                {mode === 'login' ? 'Satellite Portal' : 'Create Your Account'}
              </Typography>
            </Box>
            <form
              style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              <TextField
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={inputSx}
                required
                autoFocus
                InputLabelProps={{
                  style: { color: '#b8ff39' },
                }}
              />
              {mode === 'register' && (
                <TextField
                  label="Email"
                  variant="outlined"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  sx={inputSx}
                  required
                  type="email"
                  InputLabelProps={{
                    style: { color: '#b8ff39' },
                  }}
                />
              )}
              <TextField
                label="Password"
                variant="outlined"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={inputSx}
                required
                InputLabelProps={{
                  style: { color: '#b8ff39' },
                }}
              />
              <Button type="submit" sx={buttonSx}>
                {mode === 'login' ? 'Login' : 'Register'}
              </Button>
              {error && (
                <Typography
                  sx={{
                    color: '#ff6b6b',
                    fontSize: '0.98rem',
                    mt: 1,
                    textAlign: 'left',
                  }}
                >
                  {error}
                </Typography>
              )}
              {successMsg && (
                <Typography
                  sx={{
                    color: '#b8ff39',
                    fontSize: '0.98rem',
                    mt: 1,
                    textAlign: 'left',
                  }}
                >
                  {successMsg}
                </Typography>
              )}
            </form>
            <Box sx={{ mt: 2, width: '100%', textAlign: 'center' }}>
              {mode === 'login' ? (
                <Typography sx={{ color: '#bfc7d6', fontSize: 15 }}>
                  New user?{' '}
                  <Link
                    component="button"
                    sx={{
                      color: '#b8ff39',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
                    }}
                    onClick={() => {
                      setMode('register');
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Register here
                  </Link>
                </Typography>
              ) : (
                <Typography sx={{ color: '#bfc7d6', fontSize: 15 }}>
                  Already have an account?{' '}
                  <Link
                    component="button"
                    sx={{
                      color: '#b8ff39',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      fontFamily: 'Orbitron, Share Tech Mono, Segoe UI, Arial, sans-serif',
                    }}
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    Login here
                  </Link>
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={logoColSx}>
            <LoginSpaceBackground />
            {/* Overlay astronaut on top of space animation */}
            <img
              src="/astronaut.png"
              alt="Astronaut"
              style={{
                maxHeight: 780,
                maxWidth: '180%',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                position: 'relative',
                zIndex: 1,
                filter: 'drop-shadow(0 8px 24px rgba(0, 234, 255, 0.4))',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-10px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
              }}
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

export default LoginPage;
