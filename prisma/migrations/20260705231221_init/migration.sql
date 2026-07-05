-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('SALES', 'HR', 'FINANCE');

-- CreateTable
CREATE TABLE "RawUpload" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,

    CONSTRAINT "RawUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesTransaction" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "repName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT NOT NULL,

    CONSTRAINT "SalesTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "repName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "monthlyTarget" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTarget" (
    "id" SERIAL NOT NULL,
    "region" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "revenueTarget" DOUBLE PRECISION NOT NULL,
    "departmentCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FinanceTarget_pkey" PRIMARY KEY ("id")
);
