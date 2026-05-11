import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { useSEO } from "@/hooks/use-seo";
import { TESTIMONIALS } from "@/constants/testimonials";
import { CONTACT_INFO } from "@/constants/navigation";

const Index = () => {
  useSEO({
    title: "Home",
    description: "Authentic Ayurvedic Healing in the Heart of Hyderabad — led by Dr. K. Saraswathi Himabala, MD (Ayurveda), blending two decades of clinical expertise with classical Ayurvedic therapies.",
  });

  const heroAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroAnimation.ref} className={`pt-24 pb-12 px-4 scroll-animate ${heroAnimation.isVisible ? 'visible' : ''}`}>
        <div className="container mx-auto text-center max-w-4xl">
          <div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Healing the Natural Way
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
              Authentic Ayurvedic Healing in the Heart of Hyderabad — led by Dr. K. Saraswathi Himabala, MD (Ayurveda), blending two decades of clinical expertise with classical Ayurvedic therapies for pain relief, lifestyle disorders, and holistic wellness.
            </p>
            <Link to="/booking">
              <Button size="lg" className="rounded-full px-6 text-sm">
                Book Your Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      

      {/* About Us Section (merged from About page) */}
      <section className="py-12 px-4 bg-background/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-2">About Us</h2>
            <p className="text-muted-foreground text-sm max-w-3xl mx-auto">
              Our vision is to restore balance and holistic wellbeing through authentic Ayurvedic care. Our mission is to deliver compassionate, evidence-informed Ayurvedic treatments tailored to each patient — with a special focus on Panchakarma and chronic pain management.
            </p>
          </div>

          <div className="flex flex-col xl:flex-row items-start gap-6 px-4">
            <div className="xl:w-1/3 flex justify-center">
              <img
                src="https://via.placeholder.com/300?text=Dr+K+Saraswathi"
                alt="Dr. K. Saraswathi Himabala"
                className="w-48 h-48 rounded-lg object-cover object-center shadow-sm"
              />
            </div>

            <div className="xl:w-2/3">
              <h3 className="text-lg font-semibold">Dr. K. Saraswathi Himabala, MD (Ayurveda)</h3>
              <p className="text-sm text-muted-foreground mb-4">20+ years experience · MD Ayurveda · Specialised in Panchakarma & pain management</p>
              <p className="mb-4 leading-relaxed">
                Dr. K. Saraswathi Himabala brings over two decades of clinical experience in classical Ayurvedic therapies. She combines traditional Panchakarma techniques with individualized lifestyle and dietary guidance to help patients recover from chronic pain, metabolic disorders, and stress-related conditions. Her approach focuses on uncovering root causes and restoring long-term balance.
              </p>
              <p className="text-sm text-muted-foreground">Learn more about our approach or book a consultation to discuss your care plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section with Carousel */}
      <section ref={testimonialsAnimation.ref} className={`py-8 px-4 bg-accent/30 scroll-animate ${testimonialsAnimation.isVisible ? 'visible' : ''}`}>
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-2">Patient Success Stories</h2>
            <p className="text-muted-foreground text-xs md:text-sm">Real experiences from our healing community</p>
          </div>

          {/* Scrollable view for all screen sizes */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 md:gap-6 px-4 max-w-6xl mx-auto items-stretch" style={{ scrollSnapType: 'x mandatory' }}>
              {TESTIMONIALS.map((testimonial, index) => (
                <Card key={index} className="border-2 flex-shrink-0 w-[85vw] md:w-[400px] h-80 flex flex-col" style={{ scrollSnapAlign: 'center' }}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote className="w-8 h-8 text-primary mb-4 flex-shrink-0" />
                    <p className="text-sm mb-4 italic flex-1">{testimonial.text}</p>
                    <div className="border-t pt-4 flex-shrink-0">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.condition}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-2">Contact & Location</h2>
            <p className="text-muted-foreground text-sm max-w-3xl mx-auto">Find us at our clinic or get in touch to schedule an appointment.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 px-4">
            <div className="md:w-1/2">
              <div className="w-full overflow-hidden shadow-sm">
                <iframe
                  title="Kasturi Ayurveda Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.9!2d78.4911864!3d17.4038354!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb990106888ec9%3A0x52015ed567a390fa!2sKasturi%20Ayurveda!5e0!3m2!1sen!2sin!4v1"
                  width="100%"
                  height="400"
                  style={{ border: 0, borderRadius: 12 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
              </div>
            </div>

            <div className="md:w-1/2 flex flex-col justify-center">
              <div className="bg-background/50 p-6 rounded shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Clinic Address</h3>
                <p className="mb-4 text-sm">Kasturi Ayurveda Clinic<br/>Hyderabad, Telangana 500XXX</p>

                <h4 className="text-sm font-medium">Phone</h4>
                <p className="mb-4">{CONTACT_INFO.phone}</p>

                <h4 className="text-sm font-medium">Email</h4>
                <p className="mb-4">{CONTACT_INFO.email}</p>

                <h4 className="text-sm font-medium">Clinic Hours</h4>
                <p className="text-sm">Morning: {"10 AM – 2 PM"}<br/>Evening: {"6 PM – 9 PM"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
