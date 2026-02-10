import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col text-black selection:bg-orange-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <Image src="/logo.png" alt="Veer Salon" width={160} height={60} className="object-contain grayscale brightness-0" />
          </Link>

          <Link
            href="/my-bookings"
            className="text-sm font-bold uppercase tracking-wide px-6 py-2.5 rounded-full border border-black hover:bg-black hover:text-white transition-all duration-300"
          >
            My Bookings
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-4 md:px-6 pt-10 pb-20">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-2 gap-4 md:gap-16 items-center">

          {/* Left Content */}
          <div className="text-left space-y-4 lg:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 lg:gap-3 px-3 py-1 lg:px-4 lg:py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] lg:text-xs font-bold tracking-widest uppercase">
              <span className="relative flex h-1.5 w-1.5 lg:h-2 lg:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-orange-500"></span>
              </span>
              Premium Grooming
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-black">
              LOOK <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">SHARP.</span>
            </h2>

            <p className="text-xs sm:text-lg lg:text-2xl text-gray-500 font-light max-w-lg leading-relaxed border-l-2 border-orange-200 pl-3 lg:pl-6 leading-tight lg:leading-relaxed">
              Elevate your style. <br />
              <span className="text-black font-medium">Precision and class.</span>
            </p>

            {/* Button Moved Out */}
          </div>

          {/* Right Content / Visuals (Hero Image) */}
          <div className="relative flex items-center justify-center animate-in fade-in duration-1000 delay-200">
            <div className="relative w-full h-[250px] sm:h-[450px] lg:h-[600px] flex items-center justify-center">
              {/* Abstract geometric shapes behind image for depth */}
              <div className="absolute w-[90%] sm:w-[500px] h-[90%] sm:h-[500px] border-[1px] border-orange-100 rounded-full opacity-30 -z-10 animate-pulse-slow"></div>
              <div className="absolute w-[70%] sm:w-[400px] h-[70%] sm:h-[400px] border-[1px] border-gray-100 rounded-full opacity-50 -z-10"></div>

              <Image
                src="/hero.png"
                alt="Premium Grooming"
                fill
                className="object-contain drop-shadow-2xl z-10 hover:scale-[1.02] transition-transform duration-700"
                priority
              />

              {/* Floating Rating Card */}
              <div className="absolute bottom-2 -left-2 lg:bottom-10 lg:-left-10 bg-white/90 backdrop-blur-sm p-3 lg:p-6 shadow-2xl border border-gray-100 rounded-2xl z-20 animate-in slide-in-from-bottom-8 delay-500 transform scale-75 lg:scale-100 origin-bottom-left">
                <div className="flex items-center gap-2 lg:gap-4 mb-1 lg:mb-2">
                  <span className="text-2xl lg:text-4xl font-black text-black">4.9</span>
                  <div className="flex text-orange-500 space-x-0.5">
                    {[1, 2, 3, 4, 5].map(i => <svg key={i} className="w-3 h-3 lg:w-4 lg:h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                  </div>
                </div>
                <p className="text-[8px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold">Client Satisfaction</p>
              </div>
            </div>
          </div>

        </div>

        {/* Full Width Button Mobile */}
        <div className="mt-8 flex justify-center lg:justify-start max-w-7xl mx-auto w-full px-4 md:px-0">
          <Link
            href="/book"
            className="group relative inline-flex items-center justify-center w-full md:w-auto px-8 py-4 lg:px-12 lg:py-6 text-sm lg:text-xl font-bold text-white bg-black rounded-full hover:bg-orange-600 transition-all duration-300 shadow-xl shadow-orange-900/5 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              Book Appointment
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>
        </div>

        {/* Thin Order Section */}
        <div className="max-w-7xl mx-auto w-full mt-32 border-t border-gray-200 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Experience", value: "10 Years" },
              { label: "Barbers", value: "Expert" },
              { label: "Products", value: "Premium" },
              { label: "Vibe", value: "Modern" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-2 border-l border-black pl-6 hover:pl-8 transition-all duration-300 group cursor-default">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-widest group-hover:text-black transition-colors">{item.label}</span>
                <span className="text-4xl font-thin text-black group-hover:font-light transition-all">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
