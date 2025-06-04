module.exports = async function auditAgent(db) {
  // a simple agent to audit old tests
  const oldTests = await db.findOldTests(30);
  return oldTests.map((test) => ({
    test_id: test._id,
    recommended: "Run regression",
  }));
};
