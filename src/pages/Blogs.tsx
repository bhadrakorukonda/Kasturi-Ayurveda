import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const Blogs = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Ayurvedic Insights & Articles
          </h1>
          <p className="text-base text-muted-foreground">
            Explore the wisdom of Ayurveda through our curated articles and health tips
          </p>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="border-2">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-serif font-semibold mb-3">Coming Soon</h2>
              <p className="text-sm text-muted-foreground">
                We're preparing valuable content on Ayurvedic health, wellness tips, and treatment insights. Check back soon!
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blogs;
