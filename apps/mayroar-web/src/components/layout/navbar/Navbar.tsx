"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "../../ui/resizable-navbar";
import { useState } from "react";

export default function NavbarSection() {
  const navItems = [
    {
      name: "How it works",
      link: "#how-it-works",
    },
    {
      name: "Approach",
      link: "#approach",
    },
    {
      name: "FAQs",
      link: "#faqs",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[1900px] px-6 sm:px-8 lg:px-10">
      <Navbar className="inset-x-0 w-full">
        {/* Desktop Navigation */}
        <NavBody className="w-full max-w-none">
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            <NavbarButton variant="secondary">Login</NavbarButton>
            <NavbarButton variant="primary">Join the waitlist</NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav className="w-full max-w-none">
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-4">
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full"
              >
                Login
              </NavbarButton>
              <NavbarButton
                onClick={() => setIsMobileMenuOpen(false)}
                variant="primary"
                className="w-full bg-charcoal text-cream hover:bg-charcoal/90 rounded-2xl"
              >
                Join the waitlist
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

    </div>
  );
}

