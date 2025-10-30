import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import {
  Brain,
  Zap,
  Shield,
  Sparkles,
  MessageSquare,
  Code,
  BarChart3,
  Users,
  Globe,
  Lock,
  TrendingUp,
} from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      icon: Brain,
      title: "Advanced AI Models",
      description:
        "Access multiple cutting-edge AI models including GPT-4o, Claude 3.5 Sonnet, Gemini Pro, and more. Choose the best model for your specific task.",
    },
    {
      icon: Sparkles,
      title: "Specialized Weblets",
      description:
        "Pre-configured AI assistants optimized for specific workflows like research poster creation, Gantt chart generation, and technical analysis.",
    },
    {
      icon: MessageSquare,
      title: "Unlimited Conversations",
      description:
        "Have as many conversations as you need. No limits on messages or interactions when you're subscribed.",
    },
    {
      icon: Code,
      title: "Multi-Model Support",
      description:
        "Switch between different AI providers seamlessly. Compare outputs and find the best model for each use case.",
    },
    {
      icon: BarChart3,
      title: "Research Tools",
      description:
        "Built-in tools for scientists and researchers. Create publication-ready content, analyze data, and streamline your workflow.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Your conversations and data are protected with enterprise-grade security. We respect your privacy.",
    },
    {
      icon: Zap,
      title: "Fast & Responsive",
      description:
        "Optimized for speed. Get quick responses and smooth interactions across all supported models.",
    },
    {
      icon: Users,
      title: "Priority Support",
      description:
        "Get priority support when you need help. Our team is here to assist you with any questions or issues.",
    },
    {
      icon: Globe,
      title: "Always Available",
      description:
        "Access your Weblets from anywhere, anytime. Cloud-based infrastructure ensures 99.9% uptime.",
    },
    {
      icon: Lock,
      title: "Data Protection",
      description:
        "Your data is encrypted in transit and at rest. We follow industry best practices for data security.",
    },
    {
      icon: TrendingUp,
      title: "Continuous Updates",
      description:
        "Regular updates with new features, models, and improvements. Stay ahead with the latest AI capabilities.",
    },
    {
      icon: Brain,
      title: "Custom Workflows",
      description:
        "Create and save custom workflows. Build your own specialized assistants tailored to your specific needs.",
    },
  ];

  const useCases = [
    {
      title: "Research & Academia",
      description:
        "Perfect for researchers, scientists, and academics who need specialized AI assistance for their work.",
      examples: [
        "Generate research posters",
        "Analyze scientific data",
        "Create technical documentation",
        "Plan experiments",
      ],
    },
    {
      title: "Business & Productivity",
      description:
        "Streamline your business processes with AI-powered tools for planning, analysis, and decision-making.",
      examples: [
        "Create project timelines",
        "Generate reports",
        "Analyze market trends",
        "Draft proposals",
      ],
    },
    {
      title: "Development & Engineering",
      description:
        "Developers and engineers can leverage multiple AI models for coding, debugging, and technical analysis.",
      examples: [
        "Code generation and review",
        "Technical documentation",
        "Architecture planning",
        "Problem solving",
      ],
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-svh bg-white">
        {/* Hero Section */}
        <section className="relative isolate px-6 pt-16 pb-12 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-[image:var(--gradient)]">
              Powerful Features for Professionals
            </h1>
            <p className="mt-6 text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
              Weblet GPT provides cutting-edge AI capabilities designed for
              scientists, researchers, and technical professionals who need
              specialized tools and workflows.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-3">
              <Button asChild size="lg">
                <Link href="/pricing">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              Comprehensive AI tools and features to power your work
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-neutral-200 hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="inline-flex p-3 bg-primary/10 rounded-lg w-fit mb-2">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="mx-auto mt-24 max-w-7xl px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Perfect For
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
              Discover how Weblet GPT can transform your workflow
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="border-neutral-200 hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {useCase.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {useCase.examples.map((example, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-sm text-neutral-700">
                          {example}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-16 mt-20">
          <div className="mx-auto max-w-4xl text-center px-6">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Choose the plan that works best for you and start using Weblet GPT
              today.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-3">
              <Button asChild size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

