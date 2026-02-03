import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 px-6 py-4 flex items-center justify-between mt-4 mx-4 rounded-lg">
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
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 max-w-3xl tracking-tight">
          Book Your Salon Appointment
        </h1>
        <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl">
          No calls. No waiting. Just book instantly.
        </p>
        <Link
          href="/book"
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          Book Appointment
        </Link>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
