import { z } from "zod";

export const plantLifecycleStatusSchema = z.enum([
  "unknown_plant",
  "identified",
  "profile_created",
  "care_plan_created",
  "observing",
  "need_action",
  "follow_up_scheduled",
]);
export type PlantLifecycleStatus = z.infer<typeof plantLifecycleStatusSchema>;

export const plantProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  species: z.string().optional(),
  commonName: z.string().optional(),
  location: z.string().optional(),
  potType: z.string().optional(),
  soilType: z.string().optional(),
  lightCondition: z.string().optional(),
  growthStage: z.string().optional(),
  lifecycleStatus: plantLifecycleStatusSchema.default("unknown_plant"),
  avatarUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlantProfile = z.infer<typeof plantProfileSchema>;

export const plantIdentificationCandidateSchema = z.object({
  species: z.string(),
  commonName: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const plantIdentificationResultSchema = z.object({
  candidates: z.array(plantIdentificationCandidateSchema).min(1),
  needUserConfirmation: z.boolean(),
  followUpQuestions: z.array(z.string()).optional(),
});
export type PlantIdentificationResult = z.infer<typeof plantIdentificationResultSchema>;

export const careTaskSchema = z.object({
  id: z.string().uuid(),
  plantId: z.string().uuid(),
  userId: z.string(),
  type: z.enum(["watering", "fertilizing", "pruning", "repotting", "observation"]),
  title: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "done", "skipped"]).default("pending"),
  reason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CareTask = z.infer<typeof careTaskSchema>;

export const careGuideSchema = z.object({
  plantName: z.string(),
  light: z.object({
    requirement: z.string(),
    advice: z.string(),
  }),
  watering: z.object({
    frequency: z.string(),
    method: z.string(),
    warning: z.string(),
  }),
  soil: z.object({
    requirement: z.string(),
    advice: z.string(),
  }),
  fertilizing: z.object({
    frequency: z.string(),
    advice: z.string(),
  }),
  pruning: z.object({
    advice: z.string(),
  }).optional(),
  repotting: z.object({
    advice: z.string(),
  }).optional(),
  commonProblems: z.array(z.string()),
  nextCareTasks: z.array(careTaskSchema),
});
export type CareGuide = z.infer<typeof careGuideSchema>;

export const plantObservationSchema = z.object({
  id: z.string().uuid(),
  plantId: z.string().uuid(),
  userId: z.string(),
  date: z.string(),
  imageUrls: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  userNote: z.string().optional(),
  soilMoisture: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  lightHours: z.number().optional(),
  createdAt: z.string(),
});
export type PlantObservation = z.infer<typeof plantObservationSchema>;

export const plantStateAnalysisSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  symptoms: z.array(z.string()),
  possibleCauses: z.array(
    z.object({
      cause: z.string(),
      probability: z.enum(["low", "medium", "high"]),
      evidence: z.array(z.string()),
    }),
  ),
  actions: z.array(
    z.object({
      type: z.enum([
        "watering",
        "stop_watering",
        "move_location",
        "fertilizing",
        "pruning",
        "repotting",
        "observe",
      ]),
      instruction: z.string(),
      dueInDays: z.number().optional(),
    }),
  ),
  followUpQuestions: z.array(z.string()),
});
export type PlantStateAnalysis = z.infer<typeof plantStateAnalysisSchema>;