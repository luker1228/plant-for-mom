import { execute } from "../utils/request";
import {
  PlantsDocument,
  PlantDocument,
  CareTasksDocument,
  ObservationsDocument,
  UserByExternalIdDocument,
  CreateUserDocument,
  CreatePlantDocument,
  DeletePlantDocument,
  CreateCareTaskDocument,
  UpdateCareTaskStatusDocument,
} from "../gql/graphql";

export async function createUser(externalId: string, nickname?: string, avatarUrl?: string) {
  const data = await execute(CreateUserDocument, { externalId, nickname, avatarUrl });
  return data.createUser;
}

export async function userByExternalId(externalId: string) {
  const data = await execute(UserByExternalIdDocument, { externalId });
  return data.userByExternalId;
}

export async function fetchPlants(userId: string) {
  const data = await execute(PlantsDocument, { userId });
  return data.plants;
}

export async function fetchPlant(id: string) {
  const data = await execute(PlantDocument, { id });
  return data.plant;
}

export async function createPlant(input: {
  userId: string;
  name: string;
  species?: string;
  commonName?: string;
  location?: string;
  potType?: string;
  soilType?: string;
  lightCondition?: string;
  growthStage?: string;
  notes?: string;
}) {
  const data = await execute(CreatePlantDocument, input);
  return data.createPlant;
}

export async function deletePlant(id: string) {
  const data = await execute(DeletePlantDocument, { id });
  return data.deletePlant;
}

export async function fetchCareTasks(plantId: string, status?: "pending" | "done" | "skipped") {
  const data = await execute(CareTasksDocument, { plantId, status });
  return data.careTasks;
}

export async function createCareTask(input: {
  plantId: string;
  userId: string;
  type: "watering" | "fertilizing" | "pruning" | "repotting" | "observation";
  title?: string;
  reason?: string;
}) {
  const data = await execute(CreateCareTaskDocument, input);
  return data.createCareTask;
}

export async function updateCareTaskStatus(id: string, status: "pending" | "done" | "skipped", note?: string) {
  const data = await execute(UpdateCareTaskStatusDocument, { id, status, note });
  return data.updateCareTaskStatus;
}

export async function fetchObservations(plantId: string, limit?: number) {
  const data = await execute(ObservationsDocument, { plantId, limit });
  return data.observations;
}
