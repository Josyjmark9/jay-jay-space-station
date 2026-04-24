import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import gsap from 'gsap';
import ScrollReveal from './components/ScrollReveal';
import ModelViewer from './components/ModelViewer';
import GoogleModelViewer from './components/GoogleModelViewer';

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function NavItem({ text }: { text: string }) {
  const [cycle, setCycle] = useState(0);

  return (
    <a 
      href="#" 
      className="relative overflow-hidden group flex items-center justify-center py-1"
      onMouseEnter={() => setCycle(c => c + 1)}
      onMouseLeave={() => setCycle(c => c + 1)}
    >
      {cycle === 0 ? (
        <span className="block text-white/64 group-hover:text-white transition-colors duration-300">
          {text}
        </span>
      ) : (
        <React.Fragment key={cycle}>
          <span className="block text-white/64 group-hover:text-white transition-colors duration-300 animate-fly-out-up">
            {text}
          </span>
          <span className="absolute block text-white/64 group-hover:text-white transition-colors duration-300 animate-fly-in-up">
            {text}
          </span>
        </React.Fragment>
      )}
    </a>
  );
}

const TOTAL_FRAMES = 272;
const ZOOM_FACTOR = 1.35;

export default function App() {
  const [arrowCycle, setArrowCycle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedProgress, setLoadedProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  const screen3Ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const { scrollYProgress: screen3Progress } = useScroll({
    target: screen3Ref,
    offset: ["start end", "start start"]
  });

  // Logo Scroll Transformation
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Header animation: start moving up after screen 1
  const headerY = useTransform(scrollY, [700, 1000], [0, -150]);
  const headerOpacity = useTransform(scrollY, [800, 1100], [1, 0]);
  
  // Logo Epic Transition
  const logoX = useTransform(scrollY, [0, 1000], [0, dimensions.width * 0.35]);
  const logoY = useTransform(scrollY, [0, 1000], [0, dimensions.height * 0.4]);
  const logoScale = useTransform(scrollY, [0, 1000], [1, 10]);
  const logoLetterSpacing = useTransform(scrollY, [0, 1000], ["-0.05em", "2.5em"]);
  const logoOpacity = useTransform(scrollY, [0, 800, 1200], [1, 0.08, 0]);
  const subOpacity = useTransform(scrollY, [0, 300], [1, 0]); 

  // Finish flattening when it's 80% of the way to the top
  const rotateX = useTransform(screen3Progress, [0, 0.8], [15, 0]);
  const y = useTransform(screen3Progress, [0, 0.8], [100, 0]);

  // Preload images - Non-blocking
  useEffect(() => {
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    imagesRef.current = images;

    // Load first 10 frames as a priority for immediate scroll response
    const loadFrame = (i: number) => {
      const img = new Image();
      const frameNumber = i.toString().padStart(3, '0');
      img.src = `/ezgif-frame-${frameNumber}.jpg`;
      img.onload = () => {
        images[i - 1] = img;
        // If it's the first frame, draw it immediately
        if (i === 1 && currentFrameRef.current === 0) {
          drawFrame(0);
        }
      };
    };

    // Load frames 1-10 immediately
    for (let i = 1; i <= 10; i++) loadFrame(i);

    // Load the rest after a short delay to prioritize video/UI
    setTimeout(() => {
      for (let i = 11; i <= TOTAL_FRAMES; i++) loadFrame(i);
    }, 100);
  }, []);

  // Canvas drawing logic
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const images = imagesRef.current;

    if (!canvas || !ctx || !images[index]) return;

    const img = images[index];

    // Set canvas dimensions to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate object-fit: cover with ZOOM_FACTOR
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = canvas.width / imgRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    // Apply zoom
    const zoomedWidth = drawWidth * ZOOM_FACTOR;
    const zoomedHeight = drawHeight * ZOOM_FACTOR;
    const zoomOffsetX = offsetX - (zoomedWidth - drawWidth) / 2;
    const zoomOffsetY = offsetY - (zoomedHeight - drawHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, zoomOffsetX, zoomOffsetY, zoomedWidth, zoomedHeight);
  };

  // Scroll and Resize handling
  useEffect(() => {
    // Initial draw
    drawFrame(0);

    const handleScroll = () => {
      if (!screen3Ref.current) return;
      
      const rect = screen3Ref.current.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const stopScroll = Math.max(1, absoluteTop - (window.innerHeight * 0.2));
      
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / stopScroll));
      
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(scrollFraction * TOTAL_FRAMES)
      );

      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
      }
    };

    const handleResize = () => {
      drawFrame(currentFrameRef.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Trigger once
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Mouse Parallax
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20; // -10 to 10
      const y = (e.clientY / window.innerHeight - 0.5) * 20; // -10 to 10

      gsap.to(canvas, {
        x: -x,
        y: -y,
        duration: 0.5,
        ease: "power2.out"
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <div className="relative w-full bg-black text-white font-sans">
        {/* Fixed Background Canvas */}
        <div className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden bg-black">
          {/* Fallback Video Background */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
          >
            <source src="/bg-video.mp4" type="video/mp4" />
          </video>

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full will-change-transform z-10 opacity-60 mix-blend-screen"
            style={{ scale: 1.05 }}
          />
          {/* Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-20 pointer-events-none" />
        </div>

      {/* Fixed Header */}
      <motion.header 
        style={{ y: headerY, opacity: headerOpacity }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-20 w-[90%] flex items-center justify-between pointer-events-auto py-4 md:py-6 lg:py-10"
      >
          {/* Logo */}
          <motion.div 
            className="flex items-center cursor-default origin-left"
            style={{ 
              x: logoX, 
              y: logoY, 
              scale: logoScale,
              opacity: logoOpacity
            }}
          >
            <div className="flex flex-col">
              <motion.span 
                style={{ letterSpacing: logoLetterSpacing }}
                className="font-mono text-xl md:text-2xl font-bold leading-none whitespace-nowrap"
              >
                JOSIAH JOHNMARK
              </motion.span>
              <motion.span 
                style={{ opacity: subOpacity }}
                className="font-mono text-[9px] md:text-[10px] tracking-[0.4em] text-white/50 leading-none mt-1.5"
              >
                AEROSPACE NIGERIA
              </motion.span>
            </div>
          </motion.div>

          {/* Nav */}
          <nav className="hidden lg:flex items-stretch bg-[#1A1A1A]/40 backdrop-blur-[80px]">
            <div className="flex items-center justify-between px-6 font-mono text-xs tracking-[-0.01em] w-[480px]">
              <NavItem text="MISSION" />
              <NavItem text="AEROSPACE" />
              <NavItem text="NIGERIA HUB" />
              <NavItem text="CONSTELLATIONS" />
              <NavItem text="JOIN JJ" />
            </div>
            <button className="bg-white text-black px-6 py-5 font-mono text-xs leading-4 font-bold tracking-[-0.01em] hover:bg-gray-200 transition-colors w-[148px]">
              CREATE MISSION
            </button>
          </nav>
        </motion.header>

      {/* Scrollable Content */}
      <div className="relative z-10 w-full pointer-events-none">
        
        {/* Screen 1 */}
        <div className="w-[90%] mx-auto h-screen flex flex-col py-8 md:py-12 lg:py-16 pb-12">
          <main className="flex-1 w-full pointer-events-auto flex flex-col md:grid md:grid-cols-12 md:grid-rows-[1fr_auto] gap-y-8 md:gap-y-0 md:gap-x-8">
            
            {/* Left Heading (Bottom Left on Desktop, Top on Mobile) */}
          <div className="md:row-start-2 md:col-start-1 md:col-span-8 flex items-end">
            <Reveal delay={0.2}>
              <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-medium tracking-tight text-white whitespace-nowrap">
                Nigeria's Legacy<br />
                In Deep Space
              </h1>
            </Reveal>
          </div>

          {/* Right Text Content (Center Right on Desktop) */}
          <div className="md:row-start-1 md:col-start-8 md:col-span-5 flex flex-col justify-center items-start md:items-end text-left md:text-right">
            <Reveal delay={0.3}>
              <p className="text-[clamp(1rem,1.6vw,1.375rem)] text-white/64 leading-[1.3] font-normal max-w-[460px]">
                Josiah Johnmark Aerospace is pioneered in West Africa, delivering world-class orbital hardware and launch infrastructure. <span className="font-semibold text-white">The future of space is African.</span>
              </p>
            </Reveal>
          </div>

          {/* Right Button (Bottom Right on Desktop, Bottom on Mobile) */}
          <div className="md:row-start-2 md:col-start-8 md:col-span-5 flex items-end justify-start md:justify-end">
            <Reveal delay={0.4}>
              <div 
                className="flex items-stretch gap-1 group cursor-pointer"
                onMouseEnter={() => setArrowCycle(c => c + 1)}
                onMouseLeave={() => setArrowCycle(c => c + 1)}
              >
                {/* Text Button */}
                <div className="flex items-center px-8 py-5 bg-white/8 backdrop-blur-[80px] group-hover:bg-white transition-colors duration-300">
                  <span className="font-mono text-[12px] tracking-[-0.01em] text-white/90 group-hover:text-black transition-colors duration-300">
                    VIEW OUR MISSIONS
                  </span>
                </div>
                {/* Arrow Button */}
                <div className="relative flex items-center justify-center px-6 bg-white/8 backdrop-blur-[80px] group-hover:bg-white transition-colors duration-300 overflow-hidden">
                  {arrowCycle === 0 ? (
                    <ArrowRight className="w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300" />
                  ) : (
                    <React.Fragment key={arrowCycle}>
                      <ArrowRight className="w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300 animate-fly-out" />
                      <ArrowRight className="absolute w-5 h-5 text-white/90 group-hover:text-black transition-colors duration-300 animate-fly-in" />
                    </React.Fragment>
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          </main>
        </div>

        {/* Gap before Screen 2 */}
        <div className="h-[200px] w-full"></div>

        {/* Screen 2 */}
        <div className="w-[90%] mx-auto min-h-screen flex flex-col justify-center py-8 md:py-12 lg:py-16 pointer-events-auto">
          <div className="max-w-[1200px] w-full">
            <ScrollReveal
              baseOpacity={0.1}
              enableBlur={true}
              baseRotation={3}
              blurStrength={4}
              textClassName="text-[clamp(2rem,4.5vw,4rem)] leading-[1.1] font-medium tracking-tight text-white w-full"
            >
              Josiah Johnmark: Precision Engineering from Nigeria to the Stars. We are building the critical infrastructure required for Africa's permanent presence in the orbital frontier.
            </ScrollReveal>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
              {/* Col 1: Logo & Tagline */}
              <Reveal delay={0.1} className="md:col-span-4 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-2xl font-bold tracking-tight">JOSIAH JOHNMARK</span>
                  <span className="font-mono text-[10px] tracking-[0.5em] text-white/40 uppercase">Aerospace</span>
                </div>
                <p className="text-[11px] font-mono tracking-widest text-white/60 uppercase leading-relaxed">
                  Pioneering orbital<br/>freedom from Nigeria
                </p>
              </Reveal>

              {/* Col 2: Research */}
              <Reveal delay={0.2} className="md:col-span-4 flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Lagos Mission Control<br/>Network</h3>
                <p className="text-[15px] text-white/80 leading-relaxed">
                  Operating from our primary hub in Lagos, we provide seamless telemetry and command services for African satellite constellations and deep-space probes.
                </p>
              </Reveal>

              {/* Col 3: Tourism */}
              <Reveal delay={0.3} className="md:col-span-4 flex flex-col gap-4">
                <h3 className="text-xl font-medium text-white">Equatorial Launch<br/>Architecture</h3>
                <p className="text-[15px] text-white/80 leading-relaxed">
                  Our strategic position near the equator allows for maximum payload efficiency. Josiah Johnmark ensures Nigeria becomes the primary gateway to the African stars.
                </p>
              </Reveal>
            </div>
          </div>
        </div>

        {/* Gap before Screen 3 */}
        <div className="h-[200px] w-full"></div>

        {/* Screen 3 */}
        <div ref={screen3Ref} className="w-full h-[300vh] pointer-events-auto relative">
          <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '1200px' }}>
            <motion.div 
              style={{ rotateX, y, transformOrigin: "bottom center" }}
              className="w-[80vw] h-[80vh] bg-[#1A1A1A]/40 backdrop-blur-[80px] border border-white/10 flex flex-col items-center justify-center p-8 relative"
            >
              {/* Top Left: Title & Subtitle */}
              <div className="absolute top-8 left-8 z-10 pointer-events-none flex flex-col gap-2">
                <h3 className="text-[18px] font-sans font-medium text-white uppercase tracking-wide">
                  JJ-Alpha Sentinel
                </h3>
                <p className="text-[12px] font-sans text-white/64 max-w-[300px]">
                  Nigerian-led orbital outpost.
                </p>
              </div>

              {/* Top Right: Specs */}
              <div className="absolute top-8 right-8 z-10 pointer-events-none">
                <table className="font-mono text-[10px] text-white/80 border-separate border-spacing-x-4 border-spacing-y-1">
                  <tbody>
                    <tr>
                      <td className="text-right text-white/50">CREW:</td>
                      <td className="text-left font-medium text-white">4</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">HEIGHT:</td>
                      <td className="text-left font-medium text-white">10.1 M</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">HABITABLE VOLUME:</td>
                      <td className="text-left font-medium text-white">45 M³</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">PRESSURIZED VOLUME:</td>
                      <td className="text-left font-medium text-white">80 M³</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">MASS:</td>
                      <td className="text-left font-medium text-white">14,600 KG</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">POWER:</td>
                      <td className="text-left font-medium text-white">13,200 W</td>
                    </tr>
                    <tr>
                      <td className="text-right text-white/50">ORBIT:</td>
                      <td className="text-left font-medium text-white">51.6°, 425 KM</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="w-full h-full flex items-center justify-center">
                <GoogleModelViewer 
                  src="/122.glb"
                  autoRotate={true}
                  cameraControls={true}
                  shadowIntensity={0.5}
                  exposure={1}
                />
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
