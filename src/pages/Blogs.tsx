import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, Clock, User, Calendar, Mail } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

interface BlogPost {
  id: number;
  category: string;
  categoryLabel: string;
  title: string;
  author: string;
  readTime: string;
  date: string;
  excerpt: string;
  emoji: string;
  content: JSX.Element;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    category: "ayurveda-basics",
    categoryLabel: "Ayurveda Basics",
    title: "What is your Dosha? A beginner's guide to Vata, Pitta, and Kapha",
    author: "Dr. Saraswathi Himabala, M.D",
    readTime: "5 min read",
    date: "June 2025",
    excerpt: "Understanding your body constitution is the first step toward lasting wellness. Here's how to identify yours and what it means for your daily life.",
    emoji: "🌿",
    content: (
      <div className="space-y-4">
        <p>In Ayurveda, the three doshas—Vata, Pitta, and Kapha—are biological energies found throughout the human body and mind. They govern all physical and mental processes and provide every living being with a unique blueprint for health and fulfillment.</p>
        
        <h3 className="text-xl font-serif font-semibold">Vata (Air & Space)</h3>
        <p>Vata is the energy of movement. Those with a dominant Vata constitution are often creative, quick-thinking, and energetic. However, when imbalanced, they can experience anxiety, dry skin, and digestive issues. Vata is aggravated by cold, dry, and windy conditions.</p>
        
        <h3 className="text-xl font-serif font-semibold">Pitta (Fire & Water)</h3>
        <p>Pitta is the energy of transformation and metabolism. Pitta-dominant individuals are typically driven, intelligent, and focused. When out of balance, they may become irritable, suffer from inflammation, or experience skin rashes. Pitta is aggravated by heat and spicy foods.</p>
        
        <h3 className="text-xl font-serif font-semibold">Kapha (Earth & Water)</h3>
        <p>Kapha is the energy of structure and lubrication. Kapha types are usually calm, steady, and compassionate. Imbalances can lead to lethargy, weight gain, and congestion. Kapha is aggravated by cold and damp environments.</p>
        
        <div className="bg-accent/30 p-4 rounded-lg italic">
          At Kasturi Ayurveda, every patient begins with a comprehensive Dosha assessment before any treatment plan is designed.
        </div>
      </div>
    )
  },
  {
    id: 2,
    category: "conditions",
    categoryLabel: "Conditions",
    title: "Managing joint pain with Ayurveda — beyond painkillers",
    author: "Dr. Saraswathi Himabala, M.D",
    readTime: "6 min read",
    date: "May 2025",
    excerpt: "Chronic joint pain affects millions. Ayurvedic treatments address the root cause — inflammation and imbalanced Vata — rather than masking symptoms.",
    emoji: "🦴",
    content: (
      <div className="space-y-4">
        <p>Joint pain, known as <strong>Sandhivata</strong> in Ayurveda, is primarily a Vata-dominant condition. While modern medicine often focuses on temporary pain relief, Ayurveda seeks to remove the underlying toxicity and restore balance to the joints.</p>
        
        <h3 className="text-xl font-serif font-semibold">Ayurvedic Treatments</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Abhyanga:</strong> Full-body massage with medicated oils to lubricate joints and pacify Vata.</li>
          <li><strong>Janu Basti:</strong> Specialized treatment where a "well" of herbal oil is maintained over the knee.</li>
          <li><strong>Panchakarma:</strong> Deep detoxification to remove <em>Ama</em> (toxins) that accumulate in the joints.</li>
        </ul>
        
        <h3 className="text-xl font-serif font-semibold">Powerful Herbs</h3>
        <p>We use specific <em>Rasayana</em> herbs known for their anti-inflammatory properties:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Ashwagandha:</strong> For strengthening the nervous system and reducing stress-related pain.</li>
          <li><strong>Shallaki (Boswellia):</strong> Natural pain reliever that improves joint mobility.</li>
          <li><strong>Guggulu:</strong> Helps clear toxins from the joints and reduce swelling.</li>
        </ul>
        
        <p><strong>Dietary Advice:</strong> Avoid nightshades (tomatoes, potatoes, eggplants) and cold or raw foods during flare-ups. Patients typically see significant pain reduction within 4 to 6 weeks of consistent treatment.</p>
      </div>
    )
  },
  {
    id: 3,
    category: "seasonal",
    categoryLabel: "Seasonal Health",
    title: "Summer eating according to Ayurveda",
    author: "Dr. Saraswathi Himabala, M.D",
    readTime: "4 min read",
    date: "April 2025",
    excerpt: "Cooling foods, hydration, and Pitta-pacifying rituals to stay balanced in the heat.",
    emoji: "☀️",
    content: (
      <div className="space-y-4">
        <p>Summer is considered the <strong>Pitta season</strong>. As external heat rises, our internal fire can become overactive, leading to exhaustion, acidity, and skin irritations. Adjusting your diet is the most effective way to stay cool.</p>
        
        <h3 className="text-xl font-serif font-semibold">Foods to Favour</h3>
        <p>Focus on sweet (natural), bitter, and astringent tastes:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Cucumber, coconut, and pomegranate</li>
          <li>Buttermilk (Takra) with cumin</li>
          <li>Herbs like coriander, fennel, and mint</li>
          <li>Tender coconut water</li>
        </ul>
        
        <h3 className="text-xl font-serif font-semibold">Foods to Reduce</h3>
        <p>Minimize "heating" foods that aggravate Pitta:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Pickles and fermented foods</li>
          <li>Excessively spicy or salty snacks</li>
          <li>Alcohol and excessive caffeine</li>
        </ul>
        
        <h3 className="text-xl font-serif font-semibold">Lifestyle Rituals</h3>
        <p>Try to eat your largest meal at lunch when your digestive fire is strongest. Aim to sleep before 10 PM to allow the body to cool down properly, and apply coconut oil to your scalp before bathing for a natural cooling effect.</p>
      </div>
    )
  },
  {
    id: 4,
    category: "conditions",
    categoryLabel: "Conditions",
    title: "Ayurveda and Type 2 Diabetes — what the research says",
    author: "Dr. Saraswathi Himabala, M.D",
    readTime: "7 min read",
    date: "March 2025",
    excerpt: "How herbs like Gurmar and Bitter Gourd, alongside lifestyle changes, support blood sugar management.",
    emoji: "🩸",
    content: (
      <div className="space-y-4">
        <p>Diabetes, referred to as <strong>Madhumeha</strong> in ancient texts, is seen as a Kapha-dominant imbalance that affects the body's metabolic fire. Modern clinical research is increasingly validating traditional Ayurvedic approaches to blood sugar management.</p>
        
        <h3 className="text-xl font-serif font-semibold">Clinically Studied Herbs</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Gurmar (Gymnema sylvestre):</strong> Literally the "sugar destroyer." Research shows it can help lower HbA1c levels.</li>
          <li><strong>Bitter Gourd (Momordica charantia):</strong> Contains charantin and polypeptide-p, which act as plant-based insulin-mimetics.</li>
          <li><strong>Vijaysar (Pterocarpus marsupium):</strong> Studies suggest it can aid in the regeneration of pancreatic beta cells.</li>
          <li><strong>Turmeric:</strong> Combined with Amla, it helps reduce insulin resistance and systemic inflammation.</li>
        </ul>
        
        <div className="bg-destructive/10 p-4 border-l-4 border-destructive rounded">
          <p className="text-sm font-semibold text-destructive">Important Notice:</p>
          <p className="text-sm">Ayurvedic management of diabetes should always be conducted under medical supervision and coordinated with your endocrinologist.</p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    category: "lifestyle",
    categoryLabel: "Lifestyle",
    title: "Dinacharya — the Ayurvedic morning routine",
    author: "Dr. Saraswathi Himabala, M.D",
    readTime: "5 min read",
    date: "February 2025",
    excerpt: "Why waking before sunrise, oil pulling, and self-massage aren't rituals but medicine for the nervous system.",
    emoji: "🌅",
    content: (
      <div className="space-y-4">
        <p><strong>Dinacharya</strong> is the concept of a daily routine that follows the natural rhythms of the sun. By aligning our habits with these cycles, we support our body's internal clock and promote long-term vitality.</p>
        
        <h3 className="text-xl font-serif font-semibold">The Core Pillars</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Brahma Muhurta:</strong> Waking between 4:30 AM and 6:00 AM aligns your cortisol rhythm with the sun's rise.</li>
          <li><strong>Jihva Nirlekhana:</strong> Tongue scraping removes <em>Ama</em> (toxins) that accumulate overnight, improving digestion.</li>
          <li><strong>Gandusha:</strong> Oil pulling for 10-15 minutes helps maintain a healthy oral microbiome and strengthens the jaw.</li>
          <li><strong>Abhyanga:</strong> A quick self-massage with warm sesame oil before your shower calms the nervous system and hydrates the skin.</li>
        </ul>
        
        <p><strong>Expert Advice:</strong> If you're new to Dinacharya, don't try to adopt every practice at once. Start with just 2-3 rituals that resonate with you and build from there.</p>
      </div>
    )
  }
];

const Blogs = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  
  useSEO({
    title: "Wellness Journal",
    description: "Explore Ayurvedic insights, health tips, and traditional wisdom for modern living in our Wellness Journal.",
  });

  const filteredPosts = activeCategory === "all" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === activeCategory);

  const featuredPosts = filteredPosts.slice(0, 2);
  const remainingPosts = filteredPosts.slice(2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Wellness Journal
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ancient wisdom, modern living — insights from our clinic to help you find your natural balance.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex justify-center mb-12">
            <Tabs defaultValue="all" className="w-full max-w-2xl" onValueChange={setActiveCategory}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent">
                <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">All</TabsTrigger>
                <TabsTrigger value="ayurveda-basics" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Basics</TabsTrigger>
                <TabsTrigger value="conditions" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Conditions</TabsTrigger>
                <TabsTrigger value="seasonal" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Seasonal</TabsTrigger>
                <TabsTrigger value="lifestyle" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">Lifestyle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Featured Posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {featuredPosts.map((post) => (
              <BlogCard key={post.id} post={post} featured />
            ))}
          </div>

          {/* Remaining Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {remainingPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Newsletter Section */}
          <section className="bg-secondary/30 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto border border-border">
            <div className="max-w-xl mx-auto">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4 text-foreground">Get new posts in your inbox</h2>
              <p className="text-muted-foreground mb-8">
                Dr. Saraswathi writes monthly — no spam, just practical Ayurvedic guidance delivered straight to you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input 
                  type="email" 
                  placeholder="your@email.com" 
                  className="rounded-full h-12 bg-background border-primary/20 focus:border-primary"
                />
                <Button className="rounded-full h-12 px-8 font-semibold">
                  Subscribe
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const BlogCard = ({ post, featured = false }: { post: BlogPost; featured?: boolean }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className={`group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:border-primary/50 flex flex-col ${featured ? 'h-full' : ''}`}>
          <div className={`flex items-center justify-center text-6xl py-12 bg-accent/20 transition-colors group-hover:bg-accent/40`}>
            {post.emoji}
          </div>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-none">
                {post.categoryLabel}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {post.readTime}
              </span>
            </div>
            <CardTitle className={`${featured ? 'text-2xl md:text-3xl' : 'text-xl'} font-serif group-hover:text-primary transition-colors leading-tight`}>
              {post.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground line-clamp-3 leading-relaxed">
              {post.excerpt}
            </p>
          </CardContent>
          <CardFooter className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold uppercase">
                  SH
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{post.author}</span>
                <span className="text-[10px] text-muted-foreground">{post.date}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-3xl">
        <div className="bg-accent/20 p-12 text-center text-7xl">
          {post.emoji}
        </div>
        <div className="p-8 md:p-12 space-y-6">
          <DialogHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-4">
                {post.categoryLabel}
              </Badge>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {post.readTime}
                </span>
              </div>
            </div>
            <DialogTitle className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight">
              {post.title}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-stone max-w-none prose-headings:font-serif prose-p:leading-relaxed text-muted-foreground">
            {post.content}
          </div>
          <div className="pt-8 mt-8 border-t border-border flex justify-center">
            <Button variant="outline" className="rounded-full px-8" onClick={() => window.location.href = "/booking"}>
              Book a Consultation with Dr. Saraswathi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Blogs;
