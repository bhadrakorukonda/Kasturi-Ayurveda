import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Droplet, Heart, Leaf, Activity, Eye, Ear, Sparkles, Users, Stethoscope } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const Services = () => {
  useSEO({
    title: "Our Services",
    description: "Comprehensive Ayurvedic services including Panchakarma, pain management, beauty therapies, and wellness consultations at Kasturi Ayurveda Hyderabad.",
    keywords: "ayurvedic services, panchakarma, abhyanga, kati vasti, ayurvedic massage, pain management, beauty therapy",
  });

  const services = [
    {
      icon: <Stethoscope className="w-10 h-10 text-primary" />,
      title: "Doctor Consultation",
      description: "Comprehensive health assessment with Dr. K. Saraswathi Himabala, MD (Ayurveda). Includes dosha analysis, pulse diagnosis, and personalized treatment planning.",
      category: "Consultation"
    },
    {
      icon: <Droplet className="w-10 h-10 text-primary" />,
      title: "Panchakarma Therapies",
      description: "Complete detoxification procedures including Vamana, Virechana, Vasti, Nasya, and Rakta Mokshana (Leech Therapy & Venesection).",
      category: "Detoxification"
    },
    {
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: "Abhyanga (Ayurvedic Massage)",
      description: "Full-body therapeutic massage with medicated oils for relaxation, pain relief, and improved circulation.",
      category: "Relaxation"
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Sirodhara",
      description: "Continuous stream of warm herbal oil on the forehead for deep relaxation, stress relief, and mental clarity.",
      category: "Rejuvenation"
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Siro-Abhyanga (Head Massage)",
      description: "Specialized head and scalp massage to relieve headaches, improve hair health, and promote mental relaxation.",
      category: "Relaxation"
    },
    {
      icon: <Leaf className="w-10 h-10 text-primary" />,
      title: "Patra Potali (Ela Kizhi)",
      description: "Herbal leaf bolus massage for joint pain, muscle stiffness, and arthritis relief.",
      category: "Therapeutic"
    },
    {
      icon: <Activity className="w-10 h-10 text-primary" />,
      title: "Shastika Sali Pinda Sweda (Navara Kizhi)",
      description: "Rice bolus treatment for rejuvenation, muscle strengthening, and neurological disorders.",
      category: "Rejuvenation"
    },
    {
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: "Kati Vasti",
      description: "Lower back treatment with warm medicated oil for lumbar pain and disc problems.",
      category: "Pain Management"
    },
    {
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: "Greeva Vasti",
      description: "Neck treatment with warm medicated oil for cervical spondylosis and neck pain.",
      category: "Pain Management"
    },
    {
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: "Janu Vasti",
      description: "Knee treatment with warm medicated oil for osteoarthritis and knee pain relief.",
      category: "Pain Management"
    },
    {
      icon: <Eye className="w-10 h-10 text-primary" />,
      title: "Akshi Tarpana",
      description: "Eye rejuvenation therapy with medicated ghee for vision improvement and eye disorders.",
      category: "Eye Care"
    },
    {
      icon: <Ear className="w-10 h-10 text-primary" />,
      title: "Karna Purana",
      description: "Ear treatment with warm medicated oil for tinnitus, earache, and hearing issues.",
      category: "Ear Care"
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Udwartana",
      description: "Herbal powder massage for weight reduction, cellulite removal, and skin toning.",
      category: "Beauty"
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Beauty Therapies for Skin & Hair",
      description: "Specialized treatments for glowing skin, hair fall, dandruff, and premature greying.",
      category: "Beauty"
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Prakruthi Analysis",
      description: "Detailed constitutional assessment to determine your unique dosha type for personalized care.",
      category: "Assessment"
    },
    {
      icon: <Activity className="w-10 h-10 text-primary" />,
      title: "Nadi Pariksha",
      description: "Traditional pulse diagnosis to assess overall health and detect imbalances.",
      category: "Diagnosis"
    },
    {
      icon: <Calendar className="w-10 h-10 text-primary" />,
      title: "Holistic Diet & Lifestyle Guidance",
      description: "Personalized diet plans and lifestyle recommendations based on your Prakruthi and seasonal variations.",
      category: "Wellness"
    },
    {
      icon: <Heart className="w-10 h-10 text-primary" />,
      title: "De-addiction Treatments",
      description: "Natural therapies and counseling for overcoming substance dependencies and addictions.",
      category: "Wellness"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Our Services</h1>
            <p className="text-base text-muted-foreground">
              Comprehensive Ayurvedic therapies and treatments for holistic healing and wellness
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4">{service.icon}</div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-primary bg-accent/50 px-3 py-1 rounded-full">
                      {service.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <Link to="/booking">
                    <Button className="w-full rounded-full">Book Appointment</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center bg-accent/30 rounded-2xl p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-serif font-semibold mb-3">Not Sure Which Treatment is Right for You?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Book a consultation with our experts to get a personalized treatment plan 
              based on your unique constitution and health goals.
            </p>
            <Link to="/booking">
              <Button className="rounded-full">
                Schedule Consultation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Services;
