// contact-section/index.tsx

'use client'

import { useState } from 'react'

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Contact form submitted:', formData)
    // TODO: Implement backend integration
    alert('Vielen Dank für Ihre Nachricht! Wir melden uns bald bei Ihnen.')
    setFormData({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <section className="py-16 md:py-24 bg-muted">
      <div id="contact" className="-mt-24 mb-24 h-16"></div>
      <div className="content-container">
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">
            Kontaktieren Sie uns
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Haben Sie Fragen oder benötigen Sie Hilfe bei der Auswahl der richtigen Teile?
            <br />
            Wir sind für Sie da.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Contact Form */}
          <div className="bg-card rounded-lg shadow-xl p-6 lg:p-10">
            <h3 className="text-xl sm:text-2xl font-semibold mb-6 text-card-foreground">
              Schreiben Sie uns
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Ihr Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="ihre.email@beispiel.de"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-2">
                  Telefon (optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
                  placeholder="Ihre Telefonnummer"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-muted-foreground mb-2">
                  Nachricht *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 bg-background text-foreground resize-none placeholder:text-muted-foreground"
                  placeholder="Beschreiben Sie Ihr Anliegen..."
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto contrast-btn"
              >
                Nachricht senden
              </button>
            </form>
          </div>

          {/* Location Section */}
          <div className="flex flex-col justify-between bg-card rounded-lg shadow-xl p-6 lg:p-10">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-card-foreground">
                Besuchen Sie unsere Werkstatt
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
                    Standort
                  </label>
                  <div className="px-4 py-3 border border-border rounded-lg bg-muted">
                    <p className="text-muted-foreground mb-3">
                      Hier finden Sie unsere Werkstatt und unser Lager:
                    </p>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      Basis Camp Berlin GmbH
                    </p>
                    <p className="text-muted-foreground">
                      Hauptstrasse 51
                      <br />
                      16547 Birkenwerder
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
                    Kontakt
                  </label>
                  <div className="px-4 py-3 border border-border rounded-lg bg-muted">
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-foreground">E-Mail:</span>
                        <a
                          href="mailto:basiscampberlin-onlineshop.de"
                          className="text-primary hover:underline"
                        >
                          basiscampberlin-onlineshop.de
                        </a>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-foreground">Telefon:</span>
                        <a
                          href="tel:+4933035365540"
                          className="text-primary hover:underline"
                        >
                          03303 5365540
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
                    Öffnungszeiten
                  </label>
                  <div className="px-4 py-3 border border-border rounded-lg bg-muted">
                    <div className="space-y-2 text-muted-foreground text-sm">
                      <div className="flex justify-between">
                        <span>Montag - Freitag:</span>
                        <span className="font-semibold text-foreground">08:00–16:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Samstag - Sonntag:</span>
                        <span className="font-semibold text-foreground">Geschlossen</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base sm:text-lg font-medium text-muted-foreground mb-3">
                    Karte
                  </label>
                  <div className="h-[300px] sm:h-[350px] rounded-lg overflow-hidden">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2424.2876453221384!2d13.276584476632358!3d52.678856672058595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a85f9e5e5e5e5e%3A0x5e5e5e5e5e5e5e5e!2sHauptstrasse%2051%2C%2016547%20Birkenwerder%2C%20Germany!5e0!3m2!1sen!2sde!4v1730312000000!5m2!1sen!2sde"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Workshop Location Map - Hauptstrasse 51, Birkenwerder"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

