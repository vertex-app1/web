import React, { useEffect, useRef } from "react";

interface CanvasBackgroundProps {
  preset: string;
}

export const CanvasBackground: React.FC<CanvasBackgroundProps> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    // Setup Resize Observer for parent container to keep canvas full size
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = canvas.width = entry.contentRect.width || canvas.offsetWidth;
        height = canvas.height = entry.contentRect.height || canvas.offsetHeight;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // --- PRESET INITIALIZATION ---
    let angle = 0;
    const particles: any[] = [];
    const corporateData: any = {
      linePoints: [],
      candlesticks: [],
      lastUpdate: 0
    };

    // Initialize Tech (Plexus Neural Net)
    if (preset === "preset-tech") {
      const count = Math.min(80, Math.floor((width * height) / 12000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          radius: Math.random() * 2.5 + 1,
          pulse: Math.random() * Math.PI,
        });
      }
    }

    // Initialize Culinary (Floating Warm Embers & Sparkles)
    if (preset === "preset-culinary") {
      const count = Math.min(60, Math.floor((width * height) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height + height, // start off-screen bottom
          vy: -(Math.random() * 0.6 + 0.2),
          vx: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 4 + 1.5,
          alpha: Math.random() * 0.6 + 0.3,
          decay: Math.random() * 0.0015 + 0.0005,
          color: Math.random() > 0.4 ? "rgba(245, 158, 11, " : "rgba(239, 68, 68, ", // orange or red-orange
        });
      }
    }

    // Initialize Medical (Plus signs and drifting bio-shapes)
    if (preset === "preset-medical") {
      const count = 18;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vy: -(Math.random() * 0.2 + 0.1),
          vx: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 8 + 4,
          alpha: Math.random() * 0.35 + 0.15,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.01,
          type: Math.random() > 0.5 ? "cross" : "circle"
        });
      }
    }

    // Initialize Corporate (Pre-populate graphs to ensure instant render)
    if (preset === "preset-corporate") {
      // Left Line Chart (20 nodes)
      for (let i = 0; i < 20; i++) {
        corporateData.linePoints.push(Math.random() * 120 + 60);
      }
      // Right Candlestick Chart (12 bars)
      let prevClose = 150;
      for (let i = 0; i < 15; i++) {
        const change = (Math.random() - 0.45) * 40;
        const open = prevClose;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 12;
        const low = Math.min(open, close) - Math.random() * 12;
        corporateData.candlesticks.push({ open, close, high, low });
        prevClose = close;
      }
    }

    // --- ANIMATION LOOP ---
    const render = () => {
      // Clean, rich ultra-dark canvas backdrop matching olive/sunset/cyber UI styles
      ctx.fillStyle = "#0a0c08";
      ctx.fillRect(0, 0, width, height);

      // 1. GRID SYSTEM: Draw a technical, high-precision dark grid for cyber / data themes
      if (preset === "preset-tech" || preset === "preset-corporate" || preset === "preset-medical") {
        ctx.strokeStyle = "rgba(164, 180, 101, 0.015)";
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        ctx.beginPath();
        for (let x = 0; x < width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // --- PRESET: Tech (Dynamic Plexus Network) ---
      if (preset === "preset-tech") {
        angle += 0.003;
        
        // Draw binary matrix background rain stream (subtle)
        ctx.fillStyle = "rgba(164, 180, 101, 0.025)";
        ctx.font = "9px monospace";
        for (let i = 0; i < width; i += 60) {
          const char = Math.random() > 0.5 ? "1" : "0";
          const y = (Math.sin(angle + i) * 0.5 + 0.5) * height;
          ctx.fillText(char, i, y);
        }

        // Draw and update tech plexus nodes
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          p.pulse += 0.02;
          const currentRadius = p.radius + Math.sin(p.pulse) * 0.6;

          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(164, 180, 101, ${0.25 + Math.sin(p.pulse) * 0.1})`;
          ctx.fill();

          // Node core glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.fill();
        });

        // Draw connections with gradient/distance opacity
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 130) {
              const alpha = (1 - dist / 130) * 0.18;
              ctx.strokeStyle = `rgba(164, 180, 101, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();

              // Occasionally draw a tiny pulsing data packet on the line
              if (i % 7 === 0 && Math.random() > 0.99) {
                const ratio = (Math.sin(angle * 5) + 1) / 2;
                const px = particles[i].x + dx * ratio;
                const py = particles[i].y + dy * ratio;
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(px, py, 1.8, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }

      // --- PRESET: Medical & Healthcare Helix (Stunning & Highly Visible on Sides) ---
      else if (preset === "preset-medical") {
        angle += 0.008;

        // Draw background medical floating elements (crosses, soft cells)
        particles.forEach((p) => {
          p.y += p.vy;
          p.rotation += p.rotSpeed;

          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(45, 212, 191, ${p.alpha})`;
          
          if (p.type === "cross") {
            // Draw a neat medical plus sign
            const size = p.size;
            const thickness = size * 0.3;
            ctx.fillRect(-size / 2, -thickness / 2, size, thickness);
            ctx.fillRect(-thickness / 2, -size / 2, thickness, size);
          } else {
            // Draw transparent molecular cell outline
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(45, 212, 191, ${p.alpha * 0.8})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(p.size * 0.3, p.size * 0.2, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(45, 212, 191, ${p.alpha * 1.2})`;
            ctx.fill();
          }
          ctx.restore();
        });

        // DRAW TWO ROTATING DNA DOUBLE HELICES (Left Side & Right Side of the screen)
        // This keeps the graphics perfectly visible on both sides of the center CV card!
        const drawHelix = (centerX: number, isRightHanded: boolean) => {
          const helixWidth = Math.min(45, width * 0.05); // slightly smaller for elegance
          const nodeCount = Math.floor(height / 45);
          const spacing = height / (nodeCount + 1);

          for (let i = 0; i < nodeCount; i++) {
            const y = spacing * (i + 1);
            const factor = isRightHanded ? 1 : -1;
            const phase = angle * factor + (i * Math.PI) / 6;

            // Compute sine coordinates
            const x1 = centerX + Math.sin(phase) * helixWidth;
            const x2 = centerX - Math.sin(phase) * helixWidth;

            // Z index simulation using Cosine
            const cosPhase = Math.cos(phase);
            const size1 = (cosPhase + 1.5) * 2.8 + 1.2;
            const size2 = (-cosPhase + 1.5) * 2.8 + 1.2;
            const isFront1 = cosPhase > 0;

            // Connecting rungs (highly visible glowing lines)
            ctx.strokeStyle = "rgba(45, 212, 191, 0.16)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();

            // Rung center glowing core
            ctx.strokeStyle = "rgba(45, 212, 191, 0.4)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x1 - (x1 - x2) * 0.3, y);
            ctx.lineTo(x2 + (x1 - x2) * 0.3, y);
            ctx.stroke();

            // Atom 1
            ctx.beginPath();
            ctx.arc(x1, y, size1, 0, Math.PI * 2);
            ctx.fillStyle = isFront1 ? "#2dd4bf" : "rgba(13, 148, 136, 0.4)";
            ctx.shadowBlur = isFront1 ? 12 : 0;
            ctx.shadowColor = "#2dd4bf";
            ctx.fill();
            ctx.shadowBlur = 0;

            // Atom 2
            ctx.beginPath();
            ctx.arc(x2, y, size2, 0, Math.PI * 2);
            ctx.fillStyle = !isFront1 ? "#2dd4bf" : "rgba(13, 148, 136, 0.4)";
            ctx.shadowBlur = !isFront1 ? 12 : 0;
            ctx.shadowColor = "#2dd4bf";
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        };

        // Render helices on the margins (Left 12% and Right 88% width)
        const leftX = width * 0.12;
        const rightX = width * 0.88;
        
        if (width > 768) {
          drawHelix(leftX, true);
          drawHelix(rightX, false);
        } else {
          // On mobile, just draw one compact helix in the far background center
          drawHelix(width * 0.5, true);
        }

        // DRAW CYBER HEALTH ECG HEARTBEAT MONITOR LINE across bottom of the screen
        ctx.strokeStyle = "rgba(45, 212, 191, 0.35)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#2dd4bf";
        ctx.beginPath();

        const ecgSpeed = angle * 20;
        const baseLineY = height * 0.88;

        // Custom mathematical function to generate a repeating ECG heart pulse sequence
        const getEcgVal = (xCoord: number) => {
          const period = 240; // repeat ECG every 240px
          const localX = (xCoord + ecgSpeed) % period;
          
          if (localX > 40 && localX < 60) {
            // P Wave (small bump)
            const p = (localX - 40) / 20;
            return baseLineY - Math.sin(p * Math.PI) * 12;
          }
          if (localX >= 90 && localX < 94) {
            // Q Wave (slight dip down)
            return baseLineY + 12;
          }
          if (localX >= 94 && localX < 100) {
            // R Spike (huge vertical peak up!)
            const r = (localX - 94) / 6;
            return baseLineY + 12 - r * 90;
          }
          if (localX >= 100 && localX < 106) {
            // S Wave (sharp dip down below baseline)
            const s = (localX - 100) / 6;
            return baseLineY - 78 + s * 105;
          }
          if (localX >= 106 && localX < 112) {
            // Return to baseline
            const r2 = (localX - 106) / 6;
            return baseLineY + 27 - r2 * 27;
          }
          if (localX > 140 && localX < 170) {
            // T Wave (medium bump up)
            const t = (localX - 140) / 30;
            return baseLineY - Math.sin(t * Math.PI) * 20;
          }
          return baseLineY;
        };

        // Plot ECG line across screen width
        ctx.moveTo(0, baseLineY);
        for (let x = 0; x <= width; x += 4) {
          ctx.lineTo(x, getEcgVal(x));
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // --- PRESET: Culinary (Beautiful Warm Floating Embers) ---
      else if (preset === "preset-culinary") {
        // Soft warmth radial lighting gradients in the bottom corners
        const gradL = ctx.createRadialGradient(0, height, 20, 0, height, width * 0.3);
        gradL.addColorStop(0, "rgba(245, 158, 11, 0.08)");
        gradL.addColorStop(1, "transparent");
        ctx.fillStyle = gradL;
        ctx.fillRect(0, 0, width, height);

        const gradR = ctx.createRadialGradient(width, height, 20, width, height, width * 0.3);
        gradR.addColorStop(0, "rgba(239, 68, 68, 0.08)");
        gradR.addColorStop(1, "transparent");
        ctx.fillStyle = gradR;
        ctx.fillRect(0, 0, width, height);

        // Update and draw glowing fire embers
        particles.forEach((p) => {
          p.y += p.vy;
          p.x += p.vx + Math.sin(p.y * 0.003) * 0.15; // gentle wave wobble

          if (p.y < -20 || p.alpha <= 0) {
            p.y = height + 20;
            p.x = Math.random() * width;
            p.alpha = Math.random() * 0.6 + 0.3;
          }

          p.alpha -= p.decay;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
          ctx.shadowBlur = p.radius * 2.2;
          ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // --- PRESET: Corporate & Analytics (STUNNING Glowing Financial Charts & Dashboard) ---
      else if (preset === "preset-corporate") {
        angle += 0.0025;

        // Draw multiple dark analytical horizontal lanes
        ctx.strokeStyle = "rgba(59, 130, 246, 0.025)";
        ctx.lineWidth = 1;
        const lineCount = 6;
        for (let i = 1; i <= lineCount; i++) {
          const y = (height / (lineCount + 1)) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Render corporate metadata labels in the margins (highly professional)
        ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
        ctx.font = "9px monospace";
        
        // Left side text statistics
        ctx.fillText("[MARKET FEED: LIVE]", width * 0.04, 50);
        ctx.fillText("[SYS_PORT_SECURE: TRUE]", width * 0.04, 70);
        ctx.fillText("[ROI PERFORMANCE: +182.4%]", width * 0.04, height - 60);

        // Right side text statistics
        ctx.fillText("[SEC_ANALYTICS: ACTIVE]", width * 0.78, 50);
        ctx.fillText("[BULLISH_INDEX: 84%]", width * 0.78, 70);
        ctx.fillText("[TRACKER: GLOBAL]", width * 0.78, height - 60);

        // A. LEFT SIDE ANALYTICAL GLOWING TREND LINE CHART (Visible on Left margin, width * 0.04 to 0.28)
        if (width > 768) {
          const graphLeft = width * 0.04;
          const graphWidth = width * 0.24;
          const graphBaseY = height * 0.65;
          const ptsCount = corporateData.linePoints.length;
          const stepX = graphWidth / (ptsCount - 1);

          // Update data points dynamically over time to create smooth animation
          for (let i = 0; i < ptsCount; i++) {
            corporateData.linePoints[i] = 120 + Math.sin(angle * 3 + i * 0.4) * 35 + Math.cos(angle + i * 0.2) * 15;
          }

          // Filled Area Under Graph (Gradient)
          const fillGrad = ctx.createLinearGradient(0, graphBaseY - 150, 0, graphBaseY);
          fillGrad.addColorStop(0, "rgba(59, 130, 246, 0.12)");
          fillGrad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
          
          ctx.fillStyle = fillGrad;
          ctx.beginPath();
          ctx.moveTo(graphLeft, graphBaseY);
          for (let i = 0; i < ptsCount; i++) {
            const px = graphLeft + i * stepX;
            const py = graphBaseY - corporateData.linePoints[i];
            ctx.lineTo(px, py);
          }
          ctx.lineTo(graphLeft + graphWidth, graphBaseY);
          ctx.closePath();
          ctx.fill();

          // High contrast blue glowing trend line
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#3b82f6";
          ctx.beginPath();
          for (let i = 0; i < ptsCount; i++) {
            const px = graphLeft + i * stepX;
            const py = graphBaseY - corporateData.linePoints[i];
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Draw small glowing dots on coordinates
          for (let i = 0; i < ptsCount; i += 4) {
            const px = graphLeft + i * stepX;
            const py = graphBaseY - corporateData.linePoints[i];
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // B. RIGHT SIDE DETAILED FINANCIAL STOCK CANDLESTICK CHART (Visible on Right margin, width * 0.72 to 0.96)
        if (width > 768) {
          const chartRight = width * 0.96;
          const chartLeft = width * 0.72;
          const chartWidth = chartRight - chartLeft;
          const chartBaseY = height * 0.65;
          const barCount = corporateData.candlesticks.length;
          const stepX = chartWidth / (barCount - 1);
          const barW = stepX * 0.55;

          // Update candlesticks occasionally for realistic heartbeat ticks
          const now = Date.now();
          if (now - corporateData.lastUpdate > 1200) {
            // Shift left and append new candle
            corporateData.candlesticks.shift();
            const lastCandle = corporateData.candlesticks[corporateData.candlesticks.length - 1];
            const change = (Math.random() - 0.48) * 35;
            const open = lastCandle.close;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;
            corporateData.candlesticks.push({ open, close, high, low });
            corporateData.lastUpdate = now;
          }

          // Render candlesticks
          for (let i = 0; i < barCount; i++) {
            const candle = corporateData.candlesticks[i];
            const isBullish = candle.close >= candle.open;
            
            // Adjust coordinates to fit beautifully on right side
            const px = chartLeft + i * stepX;
            const cy = chartBaseY - 140; // baseline shift
            const oY = cy - candle.open * 0.5;
            const cY = cy - candle.close * 0.5;
            const hY = cy - candle.high * 0.5;
            const lY = cy - candle.low * 0.5;

            const themeColor = isBullish ? "#10b981" : "#ef4444"; // green or red

            // 1. Draw thin high-low wick line
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(px, hY);
            ctx.lineTo(px, lY);
            ctx.stroke();

            // 2. Draw thick solid candlestick body block
            ctx.fillStyle = themeColor;
            ctx.shadowBlur = 8;
            ctx.shadowColor = themeColor;
            const bodyH = Math.max(2, Math.abs(cY - oY));
            const topY = Math.min(cY, oY);
            ctx.fillRect(px - barW / 2, topY, barW, bodyH);
            ctx.shadowBlur = 0; // reset
          }
        } else {
          // On mobile: draw simple glowing analytical line chart across full bottom width
          ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#3b82f6";
          ctx.beginPath();
          const stepX = width / 11;
          for (let i = 0; i < 12; i++) {
            const py = height * 0.82 + Math.sin(angle * 2 + i * 0.6) * 20;
            const px = i * stepX;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // --- PRESET: Creative (Flowing liquid bezier ribbon wave loops) ---
      else if (preset === "preset-creative") {
        angle += 0.0012;

        const waveCount = 4;
        const waveGradients = [
          "rgba(236, 72, 153, ", // Hot pink
          "rgba(168, 85, 247, ", // Violet
          "rgba(59, 130, 246, ", // Cobalt blue
          "rgba(6, 182, 212, ",  // Cyan
        ];

        for (let w = 0; w < waveCount; w++) {
          const wavePhase = angle * (w + 1) * 1.6;
          const waveHeight = 70 + w * 25;
          const opacity = 0.08 + (w * 0.02);

          ctx.strokeStyle = `${waveGradients[w]}${opacity})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          // Move across width drawing bezier sine curve
          ctx.moveTo(0, height / 2);
          for (let x = 0; x <= width; x += 15) {
            const y =
              height / 2 +
              Math.sin(x * 0.0025 + wavePhase) *
                Math.cos(x * 0.001 - wavePhase) *
                waveHeight;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [preset]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      style={{ mixBlendMode: "normal" }}
    />
  );
};
