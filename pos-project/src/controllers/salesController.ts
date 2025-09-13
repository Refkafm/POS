class SalesController {
    private sales: any[] = []; // This will hold the sales data

    createSale(req: any, res: any) {
        const { productId, userId, quantity, totalAmount } = req.body;
        const newSale = { id: this.sales.length + 1, productId, userId, quantity, totalAmount };
        this.sales.push(newSale);
        res.status(201).json(newSale);
    }

    getSales(req: any, res: any) {
        res.status(200).json(this.sales);
    }

    getSaleById(req: any, res: any) {
        const saleId = parseInt(req.params.id);
        const sale = this.sales.find(s => s.id === saleId);
        if (sale) {
            res.status(200).json(sale);
        } else {
            res.status(404).json({ message: 'Sale not found' });
        }
    }
}

export default SalesController;