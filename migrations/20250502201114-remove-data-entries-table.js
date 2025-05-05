
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('Dropping DataEntries table...');
    await queryInterface.dropTable('DataEntries');
    console.log('DataEntries table dropped.');
  },

  async down (queryInterface, Sequelize) {
    // If needed, recreate the table in the down migration
    console.log('Recreating DataEntries table...');
    await queryInterface.createTable('DataEntries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      content: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    console.log('DataEntries table recreated.');
  }
};

