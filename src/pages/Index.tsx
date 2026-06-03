import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { useSEO } from "@/hooks/use-seo";
import { TESTIMONIALS } from "@/constants/testimonials";
import { CONTACT_INFO } from "@/constants/navigation";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useRef } from "react";

const Index = () => {
  useSEO({
    title: "Home",
    description:
      "Authentic Ayurvedic Healing in the Heart of Hyderabad — led by Dr. K. Saraswathi Himabala, MD (Ayurveda), blending two decades of clinical expertise with classical Ayurvedic therapies.",
  });

  const heroAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();
  const carouselRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    el.dataset.dragging = "true";
    el.dataset.startX = String(e.pageX - el.offsetLeft);
    el.dataset.scrollLeft = String(el.scrollLeft);
    el.style.cursor = "grabbing";
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el || el.dataset.dragging !== "true") return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - Number(el.dataset.startX)) * 1.5;
    el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
  };

  const onMouseUp = () => {
    const el = carouselRef.current;
    if (!el) return;
    el.dataset.dragging = "false";
    el.style.cursor = "grab";
  };

  const scrollCarousel = (direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    // determine card width (first .ka-card) or fallback to one-third
    const firstCard = el.querySelector(".ka-card") as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : Math.floor(el.clientWidth / 3);
    el.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  return (
    <div
      className="h-screen overflow-y-auto snap-y snap-proximity scroll-smooth"
      style={{ scrollPaddingTop: "88px" }}
    >
      <Navbar />

      <main>

      {/* ── HERO ── */}
      <section
        ref={heroAnimation.ref}
        className={`scroll-animate ${heroAnimation.isVisible ? "visible" : ""}`}
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scrollSnapAlign: "start",
          position: "relative",
          backgroundImage:
            "url('https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          padding: "110px 20px 40px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(20, 50, 30, 0.45)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            maxWidth: "760px",
            margin: "0 auto",
          }}
          className="animate-fade-in-up"
        >
          <h1
            style={{
              fontFamily: "serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "16px",
              lineHeight: 1.2,
            }}
          >
            Healing the Natural Way
          </h1>
          <p
            style={{
              fontSize: "clamp(0.875rem, 2vw, 1rem)",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "28px",
              lineHeight: 1.8,
              maxWidth: "640px",
              margin: "0 auto 28px",
            }}
          >
            Authentic Ayurvedic Healing in the Heart of Hyderabad — led by Dr.
            K. Saraswathi Himabala, MD (Ayurveda), blending two decades of
            clinical expertise with classical Ayurvedic therapies for pain
            relief, lifestyle disorders, and holistic wellness.
          </p>
          <Link to="/booking">
            <Button
              size="lg"
              style={{ borderRadius: "999px", padding: "12px 28px" }}
            >
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>

      {/* ── ABOUT US ── */}
      <section
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          scrollSnapAlign: "start",
          padding: "110px clamp(16px, 4vw, 24px) 40px",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            width: "100%",
            minHeight: "calc(100svh - 170px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 20px 50px rgba(16, 24, 40, 0.08)",
            padding: "clamp(20px, 3vw, 32px)",
          }}
        >
          {/* Vision & Mission */}
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2
              style={{
                fontFamily: "serif",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              About Us
            </h2>
            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                maxWidth: "680px",
                margin: "0 auto",
                lineHeight: 1.8,
              }}
            >
              Our vision is to restore balance and holistic wellbeing through
              authentic Ayurvedic care. Our mission is to deliver compassionate,
              evidence-informed Ayurvedic treatments tailored to each patient —
              with a special focus on Panchakarma and chronic pain management.
            </p>
            <div
              style={{
                marginTop: "20px",
                height: "4px",
                width: "48px",
                backgroundColor: "#6b9e78",
                borderRadius: "2px",
                margin: "20px auto 0",
              }}
            />
          </div>

          {/* Doctor Profile */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: "40px",
              alignItems: "flex-start",
            }}
          >
            {/* Photo */}
            <div
              style={{
                flex: "0 0 auto",
                width: "clamp(200px, 30%, 260px)",
                margin: "0 auto",
              }}
              className="animate-fade-in-up"
            >
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80"
                alt="Dr. K. Saraswathi Himabala"
                style={{
                  width: "100%",
                  aspectRatio: "3/4",
                  objectFit: "cover",
                  objectPosition: "center",
                  borderRadius: "16px",
                  border: "3px solid #d4e8d4",
                  display: "block",
                }}
              />
            </div>

            {/* Bio */}
            <div
              style={{ flex: "1 1 320px" }}
              className="animate-fade-in-up"
            >
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              >
                Dr. K. Saraswathi Himabala
              </h3>
              <p
                style={{
                  color: "#6b9e78",
                  fontWeight: 500,
                  marginBottom: "16px",
                }}
              >
                MD (Ayurveda)
              </p>

              {/* Badges */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                {["MD Ayurveda", "20+ Years Experience", "Panchakarma Specialist"].map(
                  (badge) => (
                    <span
                      key={badge}
                      style={{
                        background: "#e8f3e8",
                        color: "#2d5a3d",
                        padding: "6px 14px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {badge}
                    </span>
                  )
                )}
              </div>

              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: 1.8,
                  marginBottom: "12px",
                }}
              >
                Dr. K. Saraswathi Himabala brings over two decades of clinical
                experience in classical Ayurvedic therapies. She combines
                traditional Panchakarma techniques with individualized lifestyle
                and dietary guidance to help patients recover from chronic pain,
                metabolic disorders, and stress-related conditions. Her approach
                focuses on uncovering root causes and restoring long-term
                balance.
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Learn more about our approach or book a consultation to discuss
                your care plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section
        ref={testimonialsAnimation.ref}
        className={`scroll-animate ${testimonialsAnimation.isVisible ? "visible" : ""}`}
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          scrollSnapAlign: "start",
          padding: "110px clamp(16px, 4vw, 24px) 40px",
          backgroundColor: "#f0f5ec",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            width: "100%",
            backgroundColor: "#f8fbf6",
            borderRadius: "24px",
            boxShadow: "0 20px 50px rgba(43, 78, 52, 0.12)",
            padding: "clamp(20px, 3vw, 32px)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2
              style={{
                fontFamily: "serif",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Patient Success Stories
            </h2>
            <p style={{ color: "#6b7280", fontSize: "13px" }}>
              Real experiences from our healing community
            </p>
          </div>

          {/* Carousel wrapper — drag to scroll */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => scrollCarousel("left")}
              aria-label="Scroll testimonials left"
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 30,
                background: "#ffffff",
                borderRadius: "999px",
                padding: "8px",
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ChevronLeft style={{ width: 20, height: 20, color: "#2d5a3d" }} />
            </button>

            <div
              ref={carouselRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{
                display: "flex",
                gap: "24px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                cursor: "grab",
                userSelect: "none",
                height: "360px",
                alignItems: "center",
                padding: "8px 6px",
              }}
            >
              {TESTIMONIALS.map((testimonial, index) => (
                <div
                  key={index}
                  className="ka-card animate-fade-in-up"
                  style={{
                    // ── THE FIX ──
                    height: "320px",
                    display: "flex",
                    flexDirection: "column",
                    // Card styling
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "24px",
                    boxSizing: "border-box",
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <Quote
                    style={{
                      width: "28px",
                      height: "28px",
                      color: "#6b9e78",
                      flexShrink: 0,
                      marginBottom: "12px",
                    }}
                  />
                  {/* flex:1 makes this grow and push footer down */}
                  <p
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      fontStyle: "italic",
                      lineHeight: 1.7,
                      color: "#374151",
                      margin: 0,
                      // Clamp long reviews cleanly
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {testimonial.text}
                  </p>
                  {/* Footer always pinned to bottom */}
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "14px",
                      marginTop: "14px",
                      flexShrink: 0,
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      {testimonial.name}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        margin: "2px 0 0",
                      }}
                    >
                      {testimonial.condition}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollCarousel("right")}
              aria-label="Scroll testimonials right"
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 30,
                background: "#ffffff",
                borderRadius: "999px",
                padding: "8px",
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <ChevronRight style={{ width: 20, height: 20, color: "#2d5a3d" }} />
            </button>

          </div>

        </div>
      </section>

      {/* ── CONTACT & LOCATION ── */}
      <section
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          scrollSnapAlign: "start",
          padding: "110px clamp(16px, 4vw, 24px) 40px",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 20px 50px rgba(16, 24, 40, 0.08)",
            padding: "clamp(20px, 3vw, 32px)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2
              style={{
                fontFamily: "serif",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Contact & Location
            </h2>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              Find us at our clinic or get in touch to schedule an appointment.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "40px",
              alignItems: "stretch",
            }}
          >
            {/* Map */}
            <div
              style={{ flex: "1 1 320px", minHeight: "420px" }}
              className="animate-fade-in-up"
            >
              <iframe
                title="Kasturi Ayurveda Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.9!2d78.4911864!3d17.4038354!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb990106888ec9%3A0x52015ed567a390fa!2sKasturi%20Ayurveda!5e0!3m2!1sen!2sin!4v1"
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  borderRadius: "12px",
                  display: "block",
                  minHeight: "420px",
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Details */}
            <div
              style={{ flex: "1 1 280px" }}
              className="animate-fade-in-up"
            >
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "#2d5a3d",
                  marginBottom: "28px",
                }}
              >
                Get In Touch
              </h3>

              {[
                {
                  Icon: MapPin,
                  label: "Address",
                  content: (
                    <>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "2px 0 10px" }}>
                        Kasturi Ayurveda Clinic, Hyderabad, Telangana 500020
                      </p>
                      <a
                        href="https://maps.app.goo.gl/pLffCKNcDGzDJ7C69"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "6px 16px",
                          background: "#6b9e78",
                          color: "#fff",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                          textDecoration: "none",
                        }}
                      >
                        Get Directions
                      </a>
                    </>
                  ),
                },
                {
                  Icon: Phone,
                  label: "Phone",
                  content: (
                    <a
                      href={`tel:${CONTACT_INFO.phone}`}
                      style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none" }}
                    >
                      {CONTACT_INFO.phone}
                    </a>
                  ),
                },
                {
                  Icon: Mail,
                  label: "Email",
                  content: (
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        textDecoration: "none",
                        wordBreak: "break-all",
                      }}
                    >
                      {CONTACT_INFO.email}
                    </a>
                  ),
                },
                {
                  Icon: Clock,
                  label: "Clinic Hours",
                  content: (
                    <>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "2px 0 0" }}>
                        Morning: 10 AM – 2 PM
                      </p>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "2px 0 0" }}>
                        Evening: 6 PM – 9 PM
                      </p>
                    </>
                  ),
                },
              ].map(({ Icon, label, content }) => (
                <div
                  key={label}
                  style={{ display: "flex", gap: "12px", marginBottom: "24px" }}
                >
                  <Icon
                    style={{
                      width: "18px",
                      height: "18px",
                      color: "#6b9e78",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 2px" }}>
                      {label}
                    </p>
                    {content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
};

export default Index;