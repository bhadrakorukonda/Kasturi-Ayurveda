import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
}

const DEFAULT_TITLE = 'Kasturi Ayurveda - Authentic Ayurvedic Healing in Hyderabad';
const DEFAULT_DESCRIPTION = 'Experience authentic Ayurvedic healing with Dr. K. Saraswathi Himabala, MD. Specializing in Panchakarma, pain management, and holistic wellness in Hyderabad.';
const DEFAULT_KEYWORDS = 'ayurveda, ayurvedic treatment, panchakarma, hyderabad, dr saraswathi himabala, natural healing, holistic medicine';

export const useSEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage,
  ogUrl,
}: SEOProps = {}) => {
  useEffect(() => {
    // Update title
    const fullTitle = title ? `${title} | Kasturi Ayurveda` : DEFAULT_TITLE;
    document.title = fullTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', 'website', true);
    
    if (ogUrl) {
      updateMetaTag('og:url', ogUrl, true);
    }
    
    if (ogImage) {
      updateMetaTag('og:image', ogImage, true);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage);
    }
  }, [title, description, keywords, ogImage, ogUrl]);
};
