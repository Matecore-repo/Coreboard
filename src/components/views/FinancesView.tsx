import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { SalonCarousel } from "../SalonCarousel";
import type { Salon } from "../../types/salon";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancialPermissions } from "../../hooks/useFinancialPermissions";
import { DateRangeFilter, type DateRange } from "../features/finances/DateRangeFilter";
import OwnerDashboard from "./OwnerDashboard";
import SalesMarketingDashboard from "./SalesMarketingDashboard";
import OperationsDashboard from "./OperationsDashboard";
import AccountingDashboard from "./AccountingDashboard";
import ClientDashboard from "./ClientDashboard";

interface FinancesViewProps {
  selectedSalon: string | null;
  salonName?: string;
  salons?: Salon[];
  onSelectSalon?: (salonId: string, salonName: string) => void;
}

export default function FinancesView({ selectedSalon, salonName, salons = [], onSelectSalon }: FinancesViewProps) {
  const { isDemo } = useAuth();
  const { canViewFinances } = useFinancialPermissions();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  
  // Validar permisos
  if (!isDemo && !canViewFinances) {
    return (
      <PageContainer>
        <Section title="Acceso Denegado" description={salonName}>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg mb-2">No tienes permiso para ver esta sección</h3>
              <p className="text-muted-foreground mb-4">Solo los dueños pueden acceder a finanzas</p>
            </CardContent>
          </Card>
        </Section>
      </PageContainer>
    );
  }
  

  return (
    <PageContainer>
      {salons.length > 0 && (
        <div className="mb-4 p-4 sm:p-6">
          <h2 className="mb-4 text-xl md:text-2xl font-semibold">Ver tus finanzas</h2>
          <div>
            <SalonCarousel 
              salons={salons}
              selectedSalon={selectedSalon}
              onSelectSalon={onSelectSalon || (() => {})}
            />
          </div>
        </div>
      )}
      
      {/* Filtro de Fechas */}
      <div className="mb-4">
        <DateRangeFilter 
          value={dateRange || undefined}
          onChange={setDateRange}
        />
      </div>

      <div className="mt-4">
        <Section 
        title="Finanzas"
        description={salonName}
      >
        <Tabs defaultValue="owner" className="space-y-4">
          <TabsList>
            <TabsTrigger value="owner">Propietario</TabsTrigger>
            <TabsTrigger value="sales">Ventas y Marketing</TabsTrigger>
            <TabsTrigger value="operations">Operaciones</TabsTrigger>
            <TabsTrigger value="accounting">Finanzas/Contabilidad</TabsTrigger>
            <TabsTrigger value="clients">CRM/Clientes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="owner">
            <OwnerDashboard 
              selectedSalon={selectedSalon}
              salonName={salonName}
              dateRange={dateRange || undefined}
            />
          </TabsContent>
          
          <TabsContent value="sales">
            <SalesMarketingDashboard 
              selectedSalon={selectedSalon}
              dateRange={dateRange || undefined}
            />
          </TabsContent>
          
          <TabsContent value="operations">
            <OperationsDashboard 
              selectedSalon={selectedSalon}
              dateRange={dateRange || undefined}
            />
          </TabsContent>
          
          <TabsContent value="accounting">
            <AccountingDashboard 
              selectedSalon={selectedSalon}
              dateRange={dateRange || undefined}
            />
          </TabsContent>
          
          <TabsContent value="clients">
            <ClientDashboard 
              selectedSalon={selectedSalon}
              dateRange={dateRange || undefined}
            />
          </TabsContent>
        </Tabs>
      </Section>
      </div>
    </PageContainer>
  );
}