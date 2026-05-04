'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Target, Award, Heart } from 'lucide-react'
import Footer from '@/components/footer'

export default function AboutPage() {
    const values = [
        {
            icon: <Target className="w-8 h-8 text-primary" />,
            title: "Our Mission",
            description: "To combat misinformation by providing accessible, accurate deepfake detection technology that protects digital authenticity and builds trust in media."
        },
        {
            icon: <Users className="w-8 h-8 text-accent" />,
            title: "Our Team",
            description: "A diverse group of AI researchers, cybersecurity experts, and software engineers dedicated to advancing deepfake detection technology."
        },
        {
            icon: <Award className="w-8 h-8 text-primary" />,
            title: "Our Achievements",
            description: "Recognized for innovation in AI safety, with publications in top conferences and partnerships with leading organizations worldwide."
        },
        {
            icon: <Heart className="w-8 h-8 text-accent" />,
            title: "Our Commitment",
            description: "We prioritize user privacy, ethical AI development, and making advanced technology accessible to everyone who needs it."
        }
    ]

    const team = [
        {
            name: "Aditya Gaur",
            role: "Frontend Developer",
            bio: "MCA student skilled in building responsive web interfaces."
        },
        {
            name: "Jatin Aggarwal",
            role: "Backend Developer",
            bio: "MCA student focused on server-side development and APIs."
        },
        {
            name: "Piyush Sharma",
            role: "Project Lead",
            bio: "MCA student managing project flow and team coordination."
        },
        {
            name: "Vipin Kumar",
            role: "Database Administrator (DBA)",
            bio: "MCA student handling database design and data management."
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 animate-fade-in">
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <span className="text-sm text-accent font-medium">About DeepShield</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        Fighting Misinformation with AI
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        We believe that everyone deserves to know what they can trust.
                    </p>
                </div>
            </section>

            {}
            <section className="bg-secondary/30 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            The principles that guide everything we do at DeepShield.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {values.map((value, index) => (
                            <Card key={index} className="border-border animate-fade-in" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        {value.icon}
                                        <CardTitle className="text-xl">{value.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base leading-relaxed">
                                        {value.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        The experts behind DeepShield's technology and vision.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {team.map((member, index) => (
                        <Card key={index} className="border-border text-center animate-fade-in" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                            <CardHeader>
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                                    <span className="text-white text-xl font-bold">
                                        {member.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                                <CardTitle className="text-lg">{member.name}</CardTitle>
                                <CardDescription className="font-medium text-primary">{member.role}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{member.bio}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {}
            <section className="bg-primary/5 border-t border-border py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Join Our Mission</h2>
                    <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Help us build a more trustworthy digital world. Whether you're a developer, researcher, or concerned citizen,
                        there's a place for you in our community.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth">
                            <Button size="lg" className="w-full sm:w-auto">
                                Get Started
                            </Button>
                        </Link>
                        <Link href="/features">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                Explore Features
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    )
}