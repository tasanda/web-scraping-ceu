/*
  Warnings:

  - The `price` column on the `CeuCourse` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `originalPrice` column on the `CeuCourse` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `credits` column on the `CeuCourse` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `duration` column on the `CeuCourse` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('live_webinar', 'in_person', 'on_demand', 'self_paced');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('draft', 'active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'skipped');

-- AlterTable
ALTER TABLE "CeuCourse" ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'on_demand',
ADD COLUMN     "creditsString" TEXT,
ADD COLUMN     "durationString" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "priceString" TEXT,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
DROP COLUMN "price",
ADD COLUMN     "price" DECIMAL(10,2),
DROP COLUMN "originalPrice",
ADD COLUMN     "originalPrice" DECIMAL(10,2),
DROP COLUMN "credits",
ADD COLUMN     "credits" DECIMAL(5,2),
DROP COLUMN "duration",
ADD COLUMN     "duration" INTEGER;

-- CreateTable
CREATE TABLE "UserPlanningPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "preferredFields" "CourseField"[] DEFAULT ARRAY[]::"CourseField"[],
    "preferredCourseTypes" "CourseType"[] DEFAULT ARRAY[]::"CourseType"[],
    "availableDaysPerWeek" INTEGER,
    "hoursPerSession" DECIMAL(4,2),
    "preferredTimeSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "complianceDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlanningPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCredits" DECIMAL(5,2) NOT NULL,
    "targetDeadline" TIMESTAMP(3) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'draft',
    "estimatedCost" DECIMAL(10,2),
    "estimatedHours" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "PlanItemStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCompletionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "actualDuration" INTEGER,
    "rating" INTEGER,
    "difficultyRating" INTEGER,
    "wouldRecommend" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseCompletionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPlanningPreferences_userId_key" ON "UserPlanningPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPlanningPreferences_userId_idx" ON "UserPlanningPreferences"("userId");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_idx" ON "StudyPlan"("userId");

-- CreateIndex
CREATE INDEX "StudyPlan_status_idx" ON "StudyPlan"("status");

-- CreateIndex
CREATE INDEX "StudyPlan_targetDeadline_idx" ON "StudyPlan"("targetDeadline");

-- CreateIndex
CREATE INDEX "StudyPlanItem_planId_idx" ON "StudyPlanItem"("planId");

-- CreateIndex
CREATE INDEX "StudyPlanItem_courseId_idx" ON "StudyPlanItem"("courseId");

-- CreateIndex
CREATE INDEX "StudyPlanItem_status_idx" ON "StudyPlanItem"("status");

-- CreateIndex
CREATE INDEX "StudyPlanItem_scheduledDate_idx" ON "StudyPlanItem"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanItem_planId_courseId_key" ON "StudyPlanItem"("planId", "courseId");

-- CreateIndex
CREATE INDEX "CourseCompletionHistory_userId_idx" ON "CourseCompletionHistory"("userId");

-- CreateIndex
CREATE INDEX "CourseCompletionHistory_courseId_idx" ON "CourseCompletionHistory"("courseId");

-- CreateIndex
CREATE INDEX "CourseCompletionHistory_completedAt_idx" ON "CourseCompletionHistory"("completedAt");

-- CreateIndex
CREATE INDEX "CeuCourse_courseType_idx" ON "CeuCourse"("courseType");

-- CreateIndex
CREATE INDEX "CeuCourse_startDate_idx" ON "CeuCourse"("startDate");

-- AddForeignKey
ALTER TABLE "UserPlanningPreferences" ADD CONSTRAINT "UserPlanningPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CeuCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCompletionHistory" ADD CONSTRAINT "CourseCompletionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
