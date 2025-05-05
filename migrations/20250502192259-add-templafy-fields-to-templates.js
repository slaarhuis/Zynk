
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Templates', 'spaceId', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('Templates', 'assetId', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('Templates', 'documentType', {
      type: Sequelize.ENUM('document', 'presentation'), // Use ENUM for specific types
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Templates', 'spaceId');
    await queryInterface.removeColumn('Templates', 'assetId');
    await queryInterface.removeColumn('Templates', 'documentType');
    // If using PostgreSQL, you might need to drop the ENUM type separately
    // await queryInterface.sequelize.query('DROP TYPE "enum_Templates_documentType";');
  }
};
