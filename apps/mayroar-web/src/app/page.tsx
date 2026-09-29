import NavbarSection from "@/components/layout/navbar/Navbar";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import ApproachSection from "@/components/sections/ApproachSection";
import Footer from "@/components/layout/footer/Footer";
import ContactSection from "@/components/sections/ContactSection";

export default function HomePage() {
  return (
    <>
      <NavbarSection />

      <main className="mx-auto w-full max-w-[1900px]">
        <Hero />
        <ApproachSection />
        <HowItWorks />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}