import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { useSEO } from "@/hooks/use-seo";
import { TESTIMONIALS } from "@/constants/testimonials";

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

      {/* Testimonials Section with Carousel */}
      <section ref={testimonialsAnimation.ref} className={`py-8 px-4 bg-accent/30 scroll-animate ${testimonialsAnimation.isVisible ? 'visible' : ''}`}>
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-2">Patient Success Stories</h2>
            <p className="text-muted-foreground text-xs md:text-sm">Real experiences from our healing community</p>
          </div>

          {/* Scrollable view for all screen sizes */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 md:gap-6 px-4 max-w-6xl mx-auto" style={{ scrollSnapType: 'x mandatory' }}>
              {TESTIMONIALS.map((testimonial, index) => (
                <Card key={index} className="border-2 flex-shrink-0 w-[85vw] md:w-[400px]" style={{ scrollSnapAlign: 'center' }}>
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-primary mb-4" />
                    <p className="text-sm mb-4 italic">{testimonial.text}</p>
                    <div className="border-t pt-4">
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

      <Footer />
    </div>
  );
};

export default Index;
