import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Leaf, Target, Users, Briefcase, Phone, Mail, MapPin } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { CONTACT_INFO, BUSINESS_HOURS } from "@/constants/navigation";

const About = () => {
  useSEO({
    title: "About Us",
    description: "Learn about Kasturi Ayurveda, led by Dr. K. Saraswathi Himabala, MD (Ayurveda) with 20+ years of clinical excellence in authentic Ayurvedic healing.",
    keywords: "about kasturi ayurveda, dr saraswathi himabala, ayurvedic doctor hyderabad, ayurveda clinic",
  });

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-4 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto text-center max-w-4xl">
          <Leaf className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
            About Kasturi Ayurveda
          </h1>
          <p className="text-base text-muted-foreground">
            Reviving ancient wisdom, empowering modern wellness
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 hover:border-primary transition-all duration-300">
              <CardContent className="p-6">
                <Target className="w-10 h-10 text-primary mb-3" />
                <h2 className="text-2xl font-serif font-semibold mb-3">Our Vision</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  To revive and re-establish Ayurveda as a trusted, scientific, and personalized system of healing — empowering individuals to live in harmony, vitality, and balance through natural, time-tested principles.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-all duration-300">
              <CardContent className="p-6">
                <Leaf className="w-10 h-10 text-primary mb-3" />
                <h2 className="text-2xl font-serif font-semibold mb-3">Our Mission</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  At Kasturi Ayurveda, our mission is to deliver authentic Ayurvedic healing rooted in classical texts, guided by clinical expertise, and tailored to each individual's unique constitution.
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Provide safe and effective treatments for pain, lifestyle disorders, and women's health issues</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Promote preventive health through diet, lifestyle, and seasonal regimens</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Offer compassionate care that nurtures both body and mind</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Integrate traditional Ayurvedic therapies with a modern understanding of health</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Doctors */}
      <section className="py-12 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-2">Our Doctor</h2>
            <p className="text-muted-foreground text-sm">Expert practitioners dedicated to your wellness</p>
          </div>

          <Card className="border-2">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Users className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-1">Dr. K. Saraswathi Himabala</h3>
                <p className="text-primary font-medium text-sm mb-1">MD (Ayurveda)</p>
                <p className="text-xs text-muted-foreground mb-3">
                  20+ Years of Clinical Excellence
                </p>
              </div>
              
              <div className="text-left space-y-2 text-sm text-muted-foreground">
                <p>
                  Dr. K. Saraswathi Himabala is a distinguished Ayurvedic physician with over two decades of experience in classical Ayurvedic treatments and modern healthcare integration.
                </p>
                <p>
                  Her expertise spans across pain management, lifestyle disorders, women's health, and Panchakarma therapies. She is known for her compassionate approach and personalized treatment plans that address the root cause of ailments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Careers */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Briefcase className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-serif font-semibold mb-2">Join Our Team</h2>
                <p className="text-muted-foreground text-sm">
                  Be part of a healing mission that combines ancient wisdom with modern practice
                </p>
              </div>

              <div className="space-y-3 text-muted-foreground text-sm">
                <p>
                  At Kasturi Ayurveda, we're always looking for passionate Ayurvedic practitioners, therapists, and support staff who share our vision of holistic healing and patient-centered care.
                </p>
                <div className="pt-3">
                  <h3 className="font-semibold text-foreground mb-2 text-sm">Current Opportunities:</h3>
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Ayurvedic Physicians</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Panchakarma Therapists</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Front Desk & Administrative Staff</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">
                  Send your resume to:
                </p>
                <a 
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline text-xs sm:text-sm break-all"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="break-all">{CONTACT_INFO.email}</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-semibold mb-2">Get in Touch</h2>
            <p className="text-muted-foreground text-sm">We're here to answer your questions and guide you on your wellness journey</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-sm">Call Us</h3>
                <a href={`tel:${CONTACT_INFO.phone}`} className="text-sm text-primary hover:underline">
                  {CONTACT_INFO.phone}
                </a>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{BUSINESS_HOURS.morning}</p>
                  <p className="text-xs text-muted-foreground">{BUSINESS_HOURS.evening}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-sm">Email Us</h3>
                <a href={`mailto:${CONTACT_INFO.email}`} className="text-xs text-primary hover:underline break-all">
                  {CONTACT_INFO.email}
                </a>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-sm">Visit Us</h3>
                <p className="text-xs text-muted-foreground mb-2">{CONTACT_INFO.location}</p>
                <a 
                  href={CONTACT_INFO.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Get Directions
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-6">
            <Link to="/booking">
              <Button size="lg" className="rounded-full">
                Book Your Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
