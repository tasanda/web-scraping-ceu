-- CreateEnum
CREATE TYPE "CourseField" AS ENUM ('mental_health', 'nursing', 'psychology', 'counseling', 'social_work', 'other');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('planned', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('compliant', 'non_compliant', 'in_progress');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "profession" "CourseField",
    "licenseNumber" TEXT,
    "annualCeuRequirement" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeuProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CeuProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeuCourse" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "instructors" TEXT,
    "price" TEXT,
    "originalPrice" TEXT,
    "credits" TEXT,
    "duration" TEXT,
    "category" TEXT,
    "field" "CourseField" NOT NULL,
    "date" TEXT,
    "imageUrl" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeuCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCeuTracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3),
    "creditsEarned" DOUBLE PRECISION,
    "status" "CourseStatus" NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCeuTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeuCompliance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "requiredCredits" INTEGER NOT NULL,
    "earnedCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'in_progress',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CeuCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "CeuProvider_name_idx" ON "CeuProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CeuCourse_url_key" ON "CeuCourse"("url");

-- CreateIndex
CREATE INDEX "CeuCourse_providerId_idx" ON "CeuCourse"("providerId");

-- CreateIndex
CREATE INDEX "CeuCourse_field_idx" ON "CeuCourse"("field");

-- CreateIndex
CREATE INDEX "CeuCourse_category_idx" ON "CeuCourse"("category");

-- CreateIndex
CREATE INDEX "CeuCourse_scrapedAt_idx" ON "CeuCourse"("scrapedAt");

-- CreateIndex
CREATE INDEX "CeuCourse_url_idx" ON "CeuCourse"("url");

-- CreateIndex
CREATE INDEX "UserCeuTracking_userId_idx" ON "UserCeuTracking"("userId");

-- CreateIndex
CREATE INDEX "UserCeuTracking_courseId_idx" ON "UserCeuTracking"("courseId");

-- CreateIndex
CREATE INDEX "UserCeuTracking_status_idx" ON "UserCeuTracking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserCeuTracking_userId_courseId_key" ON "UserCeuTracking"("userId", "courseId");

-- CreateIndex
CREATE INDEX "CeuCompliance_userId_idx" ON "CeuCompliance"("userId");

-- CreateIndex
CREATE INDEX "CeuCompliance_year_idx" ON "CeuCompliance"("year");

-- CreateIndex
CREATE UNIQUE INDEX "CeuCompliance_userId_year_key" ON "CeuCompliance"("userId", "year");

-- AddForeignKey
ALTER TABLE "CeuCourse" ADD CONSTRAINT "CeuCourse_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CeuProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCeuTracking" ADD CONSTRAINT "UserCeuTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCeuTracking" ADD CONSTRAINT "UserCeuTracking_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CeuCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CeuCompliance" ADD CONSTRAINT "CeuCompliance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
