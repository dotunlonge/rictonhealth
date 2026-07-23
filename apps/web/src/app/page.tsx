import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Top Bar / Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            {/* Logo placeholder */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
            <span className="text-xl font-bold text-blue-900 tracking-tight">RICTON</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="/" className="text-blue-600">Home</Link>
            <Link href="#about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="#services" className="hover:text-blue-600 transition-colors">Services</Link>
            <Link href="#doctors" className="hover:text-blue-600 transition-colors">Doctors</Link>
            <Link href="#news" className="hover:text-blue-600 transition-colors">News</Link>
            <Link href="#contact" className="hover:text-blue-600 transition-colors">Contact</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-blue-900 hover:text-blue-600">Log In</Link>
            <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[600px] md:h-[700px] bg-slate-900 flex items-center">
        {/* Background Image Placeholder */}
        <div className="absolute inset-0 bg-slate-800 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-transparent"></div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-2xl">
            <p className="text-blue-300 font-semibold tracking-wider uppercase mb-4">Caring for Life</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-8">
              Leading the Way<br />in Medical Excellence
            </h1>
            <button className="bg-blue-100 text-blue-900 px-8 py-3 rounded-full font-semibold hover:bg-white transition-colors">
              Our Services
            </button>
          </div>
        </div>
      </section>

      {/* Quick Actions (Overlap) */}
      <section className="relative z-20 -mt-20 container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-blue-900 text-white p-8 md:p-10 flex flex-col justify-between group cursor-pointer hover:bg-blue-800 transition-colors">
            <div>
              <p className="text-sm text-blue-200 mb-2">Book an Appointment</p>
              <h3 className="text-2xl font-bold">Schedule now</h3>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
            </div>
          </div>
          <div className="bg-blue-600 text-white p-8 md:p-10 flex flex-col justify-between group cursor-pointer hover:bg-blue-500 transition-colors">
            <div>
              <p className="text-sm text-blue-200 mb-2">Book a Consultation</p>
              <h3 className="text-2xl font-bold">Talk to us</h3>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
              </div>
            </div>
          </div>
          <div className="bg-white text-blue-900 p-8 md:p-10 flex flex-col justify-between group cursor-pointer hover:bg-gray-50 transition-colors border-t md:border-t-0 md:border-l border-gray-100">
            <div>
              <p className="text-sm text-blue-600 mb-2 font-semibold">Find a Doctor</p>
              <h3 className="text-2xl font-bold">Our Specialists</h3>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-200 relative flex items-center justify-center">
                <span className="text-slate-400 font-medium">Doctor and Patient Image Placeholder</span>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <p className="text-blue-600 font-semibold tracking-wide uppercase text-sm">Welcome to Ricton</p>
              <h2 className="text-4xl font-bold text-blue-900">A Great Place to Receive Care</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                We are dedicated to providing the highest quality healthcare services to our patients. Our team of experienced medical professionals is committed to ensuring your well-being through comprehensive and compassionate care.
              </p>
              <Link href="/about" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all">
                Learn More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-5xl">
          <p className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-4">Care you can believe in</p>
          <h2 className="text-4xl font-bold text-blue-900 mb-16">Our Services</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Free Checkup", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: "Cardiogram", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
              { title: "DNA Testing", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
              { title: "Blood Bank", icon: "M12 21v-8m0 0V5a2 2 0 012-2h-2m-6 5h12M5.636 5.636a9 9 0 0112.728 0M12 3v10" }
            ].map((service, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={service.icon}></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{service.title}</h3>
                <p className="text-slate-500 text-sm">Professional medical care providing the best treatments.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book Appointment CTA */}
      <section className="py-24 bg-blue-900 text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-4xl font-bold">Book an Appointment</h2>
              <p className="text-blue-200 text-lg">Schedule your visit online and we will contact you to confirm.</p>
            </div>
            <div className="flex-1 w-full bg-white rounded-3xl p-8 shadow-2xl text-slate-900">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600">
                      <option>Cardiology</option>
                      <option>Neurology</option>
                      <option>Orthopedics</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="w-full bg-blue-600 text-white font-semibold py-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
                <span className="text-xl font-bold text-white tracking-tight">RICTON</span>
              </div>
              <p className="text-sm">Leading the way in medical excellence, trusted care, and advanced treatments for everyone.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Important Links</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#services" className="hover:text-white transition-colors">Services</Link></li>
                <li><Link href="#doctors" className="hover:text-white transition-colors">Doctors</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li>Call: (237) 681-812-255</li>
                <li>Email: info@ricton.com</li>
                <li>Address: 123 Health Ave, Medical City</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Newsletter</h4>
              <div className="flex gap-2">
                <input type="email" placeholder="Email Address" className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-blue-600 text-white" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-sm">
            <p>&copy; 2024 Ricton Healthcare. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
