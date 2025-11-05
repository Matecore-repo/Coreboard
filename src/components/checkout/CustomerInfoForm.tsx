import { useState } from 'react';
import { motion } from 'motion/react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/utils';

interface CustomerInfoFormProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}

interface ValidationErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export function CustomerInfoForm({
  clientName,
  clientPhone,
  clientEmail,
  onNameChange,
  onPhoneChange,
  onEmailChange,
}: CustomerInfoFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'El nombre es requerido';
    }
    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) {
      return undefined; // Opcional
    }
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(phone)) {
      return 'El teléfono contiene caracteres inválidos';
    }
    if (phone.replace(/\D/g, '').length < 8) {
      return 'El teléfono debe tener al menos 8 dígitos';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return undefined; // Opcional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'El email no es válido';
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    onNameChange(value);
    if (touched.name) {
      setErrors(prev => ({ ...prev, name: validateName(value) }));
    }
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value);
    if (touched.phone) {
      setErrors(prev => ({ ...prev, phone: validatePhone(value) }));
    }
  };

  const handleEmailChange = (value: string) => {
    onEmailChange(value);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'name') {
      setErrors(prev => ({ ...prev, name: validateName(clientName) }));
    } else if (field === 'phone') {
      setErrors(prev => ({ ...prev, phone: validatePhone(clientPhone) }));
    } else if (field === 'email') {
      setErrors(prev => ({ ...prev, email: validateEmail(clientEmail) }));
    }
  };

  const isValid = !errors.name && !errors.phone && !errors.email && clientName.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de contacto</CardTitle>
        <CardDescription>
          Completa tus datos para confirmar la reserva
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Label htmlFor="name">
            Nombre completo <span className="text-destructive">*</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="name"
              type="text"
              value={clientName}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Juan Pérez"
              className={cn(
                'pr-10',
                touched.name && errors.name && 'border-destructive',
                touched.name && !errors.name && clientName && 'border-green-500'
              )}
              aria-invalid={touched.name && !!errors.name}
            />
            {touched.name && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {errors.name ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : clientName ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {touched.name && errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <div className="relative mt-1">
            <Input
              id="phone"
              type="tel"
              value={clientPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="+54 11 1234-5678"
              className={cn(
                'pr-10',
                touched.phone && errors.phone && 'border-destructive',
                touched.phone && !errors.phone && clientPhone && 'border-green-500'
              )}
              aria-invalid={touched.phone && !!errors.phone}
            />
            {touched.phone && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {errors.phone ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : clientPhone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {touched.phone && errors.phone && (
            <p className="text-sm text-destructive mt-1">{errors.phone}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <Label htmlFor="email">Email (opcional)</Label>
          <div className="relative mt-1">
            <Input
              id="email"
              type="email"
              value={clientEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="juan@ejemplo.com"
              className={cn(
                'pr-10',
                touched.email && errors.email && 'border-destructive',
                touched.email && !errors.email && clientEmail && 'border-green-500'
              )}
              aria-invalid={touched.email && !!errors.email}
            />
            {touched.email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {errors.email ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : clientEmail ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
            )}
          </div>
          {touched.email && errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

