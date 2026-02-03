import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-black px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Veer Salon" width={150} height={40} className="object-contain" />
        </div>
        <button className="p-2 text-white hover:bg-gray-800 rounded-lg">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_salon_bg.png"
            alt="Salon Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
            Book Your Salon Appointment
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-xl font-medium drop-shadow-md">
            No calls. No waiting. Just book instantly.
          </p>
          <Link
            href="/book"
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Book Appointment
          </Link>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
