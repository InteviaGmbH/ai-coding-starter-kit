"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MunicipalityRegisterForm } from "@/components/auth/municipality-register-form"
import { CandidateRegisterForm } from "@/components/auth/candidate-register-form"

export function RegisterRoleToggle() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrieren</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="municipality">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="municipality">Gemeinde</TabsTrigger>
            <TabsTrigger value="candidate">Kandidat</TabsTrigger>
          </TabsList>
          <TabsContent value="municipality" className="pt-4">
            <MunicipalityRegisterForm />
          </TabsContent>
          <TabsContent value="candidate" className="pt-4">
            <CandidateRegisterForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
