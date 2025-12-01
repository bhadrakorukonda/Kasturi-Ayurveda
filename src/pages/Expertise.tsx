import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Shield, HeartPulse, Pill, Droplet, Sparkles, User, Baby, Apple } from "lucide-react";

const Expertise = () => {
  const expertiseAreas = [
    {
      icon: <Activity className="w-10 h-10 text-primary" />,
      title: "Pain Management",
      description: "Specialized treatments for chronic pain, joint pain, back pain, and musculoskeletal disorders using traditional Ayurvedic therapies"
    },
    {
      icon: <Shield className="w-10 h-10 text-primary" />,
      title: "Auto-immune Diseases",
      description: "Holistic approach to managing auto-immune conditions through immune modulation and constitutional balance"
    },
    {
      icon: <HeartPulse className="w-10 h-10 text-primary" />,
      title: "Lifestyle Disorders",
      description: "PCOD/PCOS, Thyroid disorders, Diabetes, Hypertension, and Weight Management through personalized diet and lifestyle modifications"
    },
    {
      icon: <Pill className="w-10 h-10 text-primary" />,
      title: "Liver and Gastric Problems",
      description: "Treatment for digestive disorders, liver conditions, and gastric issues using natural herbs and therapeutic procedures"
    },
    {
      icon: <Droplet className="w-10 h-10 text-primary" />,
      title: "Kidney Stones",
      description: "Natural dissolution and prevention of kidney stones through Ayurvedic medicines and dietary guidance"
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Skin Diseases",
      description: "Comprehensive care for various skin conditions including eczema, psoriasis, acne, and pigmentation disorders"
    },
    {
      icon: <User className="w-10 h-10 text-primary" />,
      title: "Hair Problems",
      description: "Treatment for hair fall, premature greying, dandruff, and scalp conditions through specialized therapies"
    },
    {
      icon: <Baby className="w-10 h-10 text-primary" />,
      title: "Garbha Sanskar",
      description: "Prenatal care program for healthy pregnancy and child development based on ancient Ayurvedic principles"
    },
    {
      icon: <Apple className="w-10 h-10 text-primary" />,
      title: "Paediatric Health",
      description: "Swarna Prashan for immunity building and diet counseling for optimal growth and development in children"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-8 px-4 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Our Areas of Expertise
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Specialized Ayurvedic care for a wide range of health conditions, combining ancient wisdom with modern clinical expertise
          </p>
        </div>
      </section>

      {/* Expertise Grid */}
      <section className="py-8 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expertiseAreas.map((area, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4">{area.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{area.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Expertise;
