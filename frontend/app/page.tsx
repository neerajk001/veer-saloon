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
            <Image src="/logo.png" alt="Veer Salon" width={120} height={40} className="object-contain grayscale brightness-0" />
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
      <main className="flex-1 flex flex-col justify-center px-6 pt-16 pb-20">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Content */}
          <div className="text-left space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Premium Grooming
            </div>

            <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] text-black">
              LOOK <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">SHARP.</span>
            </h2>

            <p className="text-xl md:text-2xl text-gray-500 font-light max-w-lg leading-relaxed border-l-2 border-orange-200 pl-6">
              Elevate your style with master barbers. <br />
              <span className="text-black font-medium">Precision, care, and class.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/book"
                className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white bg-black rounded-full hover:bg-orange-600 transition-all duration-300 shadow-xl shadow-orange-900/5 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Book Appointment
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </Link>
            </div>
          </div>

          {/* Right Content / Visuals (Abstract/Typographic) */}
          <div className="relative hidden lg:flex items-center justify-center animate-in fade-in duration-1000 delay-200">
            {/* Abstract geometric shapes using "black and orange" */}

            {/* Concentric Circles */}
            <div className="absolute w-[500px] h-[500px] border-[1px] border-gray-100 rounded-full opacity-50"></div>
            <div className="absolute w-[400px] h-[400px] border-[1px] border-gray-200 rounded-full opacity-50"></div>

            {/* Big Number Typography */}
            <div className="relative font-black text-[18rem] leading-none text-gray-50 select-none -z-10 tracking-tighter">
              '25
            </div>

            {/* Floating Card */}
            <div className="absolute top-1/2 right-10 bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 rotate-6 hover:rotate-0 transition-transform duration-500 cursor-default">
              <div className="flex justify-between items-end mb-4 gap-8">
                <div className="text-5xl font-black text-black">4.9</div>
                <div className="flex text-orange-500 space-x-1">
                  {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
                </div>
              </div>
              <div className="h-1 w-full bg-gray-100 mb-4 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-black"></div>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Client Satisfaction</p>
            </div>
          </div>

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
