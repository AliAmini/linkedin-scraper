-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `size` ENUM('RANGE_1_10', 'RANGE_11_50', 'RANGE_51_200', 'RANGE_201_500', 'RANGE_501_1000', 'RANGE_1001_5000', 'RANGE_5001_10000', 'RANGE_10001_PLUS', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `sizeLabel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_linkedinUrl_key`(`linkedinUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `profileUrl` VARCHAR(191) NOT NULL,
    `connectionNote` VARCHAR(191) NULL,
    `connectionStatus` ENUM('NONE', 'PENDING', 'CONNECTED', 'FAILED') NOT NULL DEFAULT 'NONE',
    `connectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_profileUrl_key`(`profileUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Experience` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `personId` INTEGER NOT NULL,
    `companyId` INTEGER NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `companyUrl` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `duration` VARCHAR(191) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Experience_personId_idx`(`personId`),
    INDEX `Experience_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Experience` ADD CONSTRAINT `Experience_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Experience` ADD CONSTRAINT `Experience_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
